import hashlib
import json
from datetime import datetime
from models import BlockchainBlock, BlockchainTransaction, BlockchainItemState, Item, User
from __init__ import db
from utils.db_utils import generate_id

class BlockchainService:
    """Service layer for blockchain operations"""
    
    def __init__(self):
        self.current_block_number = 0
        self.MAX_TRANSACTIONS_PER_BLOCK = 10  # Maximum transactions per block

    def calculate_transaction_hash(self, transaction_data, transaction_id=None, timestamp=None):
        """Calculate SHA256 hash of transaction data with unique identifiers"""
        # Add timestamp to ensure uniqueness
        if timestamp is None:
            timestamp = datetime.now().isoformat()

        # Add transaction ID if provided
        if transaction_id:
            transaction_data['transaction_id'] = transaction_id

        # Add timestamp to transaction data to ensure uniqueness
        transaction_data['timestamp'] = timestamp

        transaction_string = json.dumps(transaction_data, sort_keys=True, separators=(',', ':'))
        return hashlib.sha256(transaction_string.encode()).hexdigest()
    
    def calculate_merkle_root(self, transactions):
        """Calculate Merkle root from transaction hashes"""
        if not transactions:
            return hashlib.sha256(b"").hexdigest()
        
        hashes = [self.calculate_transaction_hash(tx) for tx in transactions]
        
        while len(hashes) > 1:
            if len(hashes) % 2 != 0:
                hashes.append(hashes[-1])
            
            new_hashes = []
            for i in range(0, len(hashes), 2):
                combined = hashes[i] + hashes[i + 1]
                new_hashes.append(hashlib.sha256(combined.encode()).hexdigest())
            hashes = new_hashes
        
        return hashes[0] if hashes else hashlib.sha256(b"").hexdigest()
    
    def create_genesis_block(self):
        """Create the first blockchain block"""
        if BlockchainBlock.query.first():
            return BlockchainBlock.query.first()

        genesis_block = BlockchainBlock(
            id=generate_id('BC', BlockchainBlock),
            block_number=0,
            block_hash=hashlib.sha256(b"genesis").hexdigest(),
            previous_hash="0" * 64,
            transaction_count=0,
            merkle_root="0" * 64
        )
        
        db.session.add(genesis_block)
        db.session.commit()
        return genesis_block
    
    def get_or_create_current_block(self):
        """Get current block or create new one if current is full"""
        current_block = BlockchainBlock.query.order_by(
            BlockchainBlock.block_number.desc()
        ).first()

        if not current_block:
            return self.create_genesis_block()

        # Check if current block is full
        if current_block.transaction_count >= self.MAX_TRANSACTIONS_PER_BLOCK:
            return self.create_new_block()

        return current_block

    def create_new_block(self):
        """Create a new blockchain block"""
        # Get previous block
        last_block = BlockchainBlock.query.order_by(BlockchainBlock.block_number.desc()).first()
        if not last_block:
            return self.create_genesis_block()

        # Create new block
        new_block = BlockchainBlock(
            id=generate_id('BC', BlockchainBlock),
            block_number=last_block.block_number + 1,
            block_hash="",  # Will be calculated after transactions are added
            previous_hash=last_block.block_hash,
            transaction_count=0,
            merkle_root="0" * 64  # Will be updated when transactions are added
        )

        db.session.add(new_block)
        db.session.flush()  # Get the ID without committing

        # Calculate initial block hash (will be recalculated when transactions are added)
        self._update_block_hash(new_block)

        db.session.commit()
        return new_block

    def _update_block_hash(self, block):
        """Update block hash and merkle root"""
        # Get all transactions in this block
        transactions = BlockchainTransaction.query.filter_by(block_id=block.id).all()

        # Calculate merkle root from transactions
        transaction_data = []
        for tx in transactions:
            tx_data = json.loads(tx.transaction_data) if tx.transaction_data else {}
            transaction_data.append(tx_data)

        block.merkle_root = self.calculate_merkle_root(transaction_data)
        block.transaction_count = len(transactions)

        # Calculate block hash
        block_data = {
            'block_number': block.block_number,
            'timestamp': block.timestamp.isoformat(),
            'previous_hash': block.previous_hash,
            'merkle_root': block.merkle_root,
            'transaction_count': block.transaction_count
        }
        block.block_hash = hashlib.sha256(
            json.dumps(block_data, sort_keys=True).encode()
        ).hexdigest()

    def add_transaction_to_block(self, transaction):
        """Add a transaction to the current block and update block hash"""
        current_block = self.get_or_create_current_block()
        transaction.block_id = current_block.id

        db.session.add(transaction)
        db.session.flush()

        # Update block hash and merkle root
        self._update_block_hash(current_block)

        # Update or create blockchain item state
        self._update_item_state(transaction)

        return current_block

    def _update_item_state(self, transaction):
        """Update or create blockchain item state record"""
        from models import BlockchainItemState, Item

        # Get the item to determine current state
        item = Item.query.get(transaction.item_id)
        current_state_id = None
        if item and item.state_id:
            current_state_id = item.state_id

        # Deactivate previous state record for this item
        previous_states = BlockchainItemState.query.filter_by(
            item_id=transaction.item_id,
            is_active=True
        ).all()

        for state in previous_states:
            state.is_active = False

        # Create new current state record
        new_state = BlockchainItemState(
            id=generate_id('BIS', BlockchainItemState),
            item_id=transaction.item_id,
            transaction_id=transaction.id,
            current_quantity=transaction.new_quantity or 0,
            current_state_id=current_state_id,
            current_location=transaction.new_location,
            is_active=True
        )

        db.session.add(new_state)
        db.session.flush()

    def create_block(self, transactions_data):
        """Create a new blockchain block with transactions"""
        if not transactions_data:
            return None
        
        # Get previous block
        last_block = BlockchainBlock.query.order_by(BlockchainBlock.block_number.desc()).first()
        if not last_block:
            last_block = self.create_genesis_block()
        
        # Calculate Merkle root
        merkle_root = self.calculate_merkle_root(transactions_data)
        
        # Create new block
        new_block = BlockchainBlock(
            id=generate_id('BC', BlockchainBlock),
            block_number=last_block.block_number + 1,
            block_hash="",  # Will be calculated
            previous_hash=last_block.block_hash,
            transaction_count=len(transactions_data),
            merkle_root=merkle_root
        )
        
        # Calculate block hash
        block_data = {
            'block_number': new_block.block_number,
            'timestamp': new_block.timestamp.isoformat(),
            'previous_hash': new_block.previous_hash,
            'merkle_root': merkle_root,
            'transaction_count': new_block.transaction_count
        }
        new_block.block_hash = hashlib.sha256(
            json.dumps(block_data, sort_keys=True).encode()
        ).hexdigest()
        
        db.session.add(new_block)
        db.session.commit()
        return new_block
    
    def record_item_creation(self, item_id, quantity, user_id):
        """Record item creation on blockchain"""
        transaction_id = generate_id('BCT', BlockchainTransaction)
        timestamp = datetime.now().isoformat()

        # Get or create the 'available' state from ItemStateType
        from models import ItemStateType
        available_state = ItemStateType.query.filter_by(state_name='available').first()

        transaction_data = {
            'item_id': item_id,
            'transaction_type': 'CREATE',
            'old_quantity': 0,
            'new_quantity': quantity,
            'old_state_id': None,
            'new_state_id': available_state.id if available_state else None,
            'old_location': None,
            'new_location': None,
            'user_id': user_id
        }
        print(f"Recording item creation: {transaction_data}")
        transaction_hash = self.calculate_transaction_hash(transaction_data, transaction_id, timestamp)

        transaction = BlockchainTransaction(
            id=transaction_id,
            transaction_hash=transaction_hash,
            item_id=item_id,
            user_id=user_id,
            transaction_type='CREATE',
            old_quantity=0,
            new_quantity=quantity,
            old_state_id=None,
            new_state_id=available_state.id if available_state else None,
            transaction_data=json.dumps(transaction_data)
        )
        
        # Set the initial state for the item
        item = Item.query.get(item_id)
        if item and available_state:
            item.state_id = available_state.id

        # Use proper block management
        current_block = self.add_transaction_to_block(transaction)
        db.session.commit()
        
        print(f"Transaction {transaction.id} added to block {current_block.id}")
        return transaction
    
    def record_item_split(self, parent_item_id, child_item_id, split_quantity, remaining_quantity, user_id):
        """Record item split transaction on blockchain with proper chronological inheritance"""
        parent = Item.query.get(parent_item_id)
        
        transaction_data = {
            'parent_item_id': parent_item_id,
            'child_item_id': child_item_id,
            'split_quantity': split_quantity,
            'remaining_quantity': remaining_quantity,
            'user_id': user_id,
            'split_from': parent_item_id
        }

        # Step 1: Record parent update (SPLIT transaction) FIRST
        parent_transaction_data = {
            **transaction_data,
            'transaction_type': 'SPLIT',
            'target_item': parent_item_id,
            'split_to': child_item_id
        }
        parent_tx = BlockchainTransaction(
            id=generate_id('BCT', BlockchainTransaction),
            transaction_hash=self.calculate_transaction_hash(parent_transaction_data),
            item_id=parent_item_id,
            user_id=user_id,
            transaction_type='SPLIT',
            old_quantity=parent.quantity + split_quantity if parent else 0,
            new_quantity=remaining_quantity,
            old_state_id=parent.state_id,
            new_state_id=parent.state_id,  # State remains the same for parent
            transaction_data=json.dumps(parent_transaction_data)
        )
        
        parent_block = self.add_transaction_to_block(parent_tx)

        # Step 2: NOW inherit ALL parent's history (including the split transaction we just created)
        self._inherit_parent_blockchain_history(parent_item_id, child_item_id, user_id)

        # Step 3: Record child creation (CREATE BY SPLIT transaction) LAST
        child_transaction_data = {
            **transaction_data,
            'transaction_type': 'CREATE_BY_SPLIT',
            'target_item': child_item_id,
            'inherited_from': parent_item_id
        }
        child_tx = BlockchainTransaction(
            id=generate_id('BCT', BlockchainTransaction),
            transaction_hash=self.calculate_transaction_hash(child_transaction_data),
            item_id=child_item_id,
            user_id=user_id,
            transaction_type='CREATE',
            old_quantity=0,
            new_quantity=split_quantity,
            old_state_id=None,
            new_state_id=parent.state_id if parent else None,  # Inherit parent's state
            transaction_data=json.dumps(child_transaction_data)
        )
        
        child_block = self.add_transaction_to_block(child_tx)
        db.session.commit()
        
        print(f"Split transactions added: Parent to block {parent_block.id}, Child to block {child_block.id}")
        return [parent_tx, child_tx]
    
    def _inherit_parent_blockchain_history(self, parent_item_id, child_item_id, user_id):
        """Create inheritance records for child item from parent's blockchain history"""
        # Get ALL parent transactions, including the split transaction that just happened
        # We need to refresh the parent transactions after the split transaction is added
        db.session.flush()  # Ensure split transaction is visible in this session

        parent_transactions = BlockchainTransaction.query.filter_by(item_id=parent_item_id)\
            .order_by(BlockchainTransaction.timestamp.asc()).all()

        for parent_tx in parent_transactions:
            # Create inheritance transaction for each parent transaction (including the split)
            inheritance_data = {
                'inherited_from': parent_item_id,
                'original_transaction_id': parent_tx.id,
                'original_transaction_hash': parent_tx.transaction_hash,
                'original_transaction_type': parent_tx.transaction_type,
                'original_timestamp': parent_tx.timestamp.isoformat(),
                'inheritance_reason': 'ITEM_SPLIT'
            }

            inheritance_tx = BlockchainTransaction(
                id=generate_id('BCT', BlockchainTransaction),
                transaction_hash=self.calculate_transaction_hash(inheritance_data),
                item_id=child_item_id,
                user_id=user_id,
                transaction_type='INHERIT',
                old_quantity=parent_tx.old_quantity,
                new_quantity=parent_tx.new_quantity,
                old_state_id=parent_tx.old_state_id,
                new_state_id=parent_tx.new_state_id,
                old_location=parent_tx.old_location,
                new_location=parent_tx.new_location,
                transaction_data=json.dumps(inheritance_data)
            )

            self.add_transaction_to_block(inheritance_tx)

    def record_item_assignment(self, item_id, task_id, user_id):
        """Record item assignment to task on blockchain"""
        item = Item.query.get(item_id)
        
        transaction_id = generate_id('BCT', BlockchainTransaction)
        timestamp = datetime.now().isoformat()

        # Get state information using ItemStateType
        old_state = None
        new_state = None
        
        if item:
            # Get current state from ItemStateType
            from models import ItemStateType
            if item.state_id:
                old_state = ItemStateType.query.get(item.state_id)
            
            # Find the appropriate new state for 'assigned' state
            assigned_state = ItemStateType.query.filter_by(state_name='Assigned').first()
            if not assigned_state:
                # Fallback to creating or finding a reserved state
                assigned_state = ItemStateType.query.filter_by(state_name='Reserved').first()

            if assigned_state:
                new_state = assigned_state

        transaction_data = {
            'item_id': item_id,
            'task_id': task_id,
            'user_id': user_id,
            'old_state_id': old_state.id if old_state else None,
            'new_state_id': new_state.id if new_state else None,
        }
        print(f"Recording item assignment: {transaction_data}")

        transaction = BlockchainTransaction(
            id=transaction_id,
            transaction_hash=self.calculate_transaction_hash(transaction_data, transaction_id, timestamp),
            item_id=item_id,
            user_id=user_id,
            transaction_type='ASSIGN',
            old_quantity=item.quantity if item else 0,
            new_quantity=item.quantity if item else 0,
            old_state_id=old_state.id,
            new_state_id=new_state.id if new_state else None,
            new_location=f"task-{task_id}",
            transaction_data=json.dumps(transaction_data)
        )
        
        # Update item's state_id if we found a new state
        if item and new_state:
            item.state_id = new_state.id

        current_block = self.add_transaction_to_block(transaction)
        db.session.commit()

        print(f"Assignment transaction {transaction.id} added to block {current_block.id}")
        return transaction
    
    def record_item_task_removal(self, item_id, task_id, old_task_ids, new_task_ids, user_id, old_state_id=None, new_state_id=None):
        """Record item task removal transaction on blockchain"""
        try:
            item = Item.query.get(item_id)
            if not item:
                raise ValueError(f"Item {item_id} not found")

            # Get state information using ItemStateType
            from models import ItemStateType

            # If state IDs are not provided, determine them automatically
            if old_state_id is None and item.state_id:
                old_state_id = item.state_id

            if new_state_id is None:
                # Determine new state based on remaining task assignments
                if not new_task_ids:
                    # No more tasks, should be available
                    available_state = ItemStateType.query.filter_by(state_name='available').first()
                    new_state_id = available_state.id if available_state else None
                else:
                    # Still assigned to other tasks, keep assigned state
                    assigned_state = ItemStateType.query.filter_by(state_name='assigned').first()
                    new_state_id = assigned_state.id if assigned_state else None

            transaction_data = {
                'item_id': item_id,
                'task_id': task_id,
                'transaction_type': 'TASK_REMOVAL',
                'old_task_ids': old_task_ids,
                'new_task_ids': new_task_ids,
                'user_id': user_id,
                'quantity': float(item.quantity),
                'old_state_id': old_state_id,
                'new_state_id': new_state_id,
            }

            print(f"Recording item task removal: {transaction_data}")

            # Determine location changes
            old_location = f"Tasks: {', '.join(old_task_ids)}" if old_task_ids else None
            new_location = f"Tasks: {', '.join(new_task_ids)}" if new_task_ids else None

            transaction = BlockchainTransaction(
                id=generate_id('BCT', BlockchainTransaction),
                transaction_hash=self.calculate_transaction_hash(transaction_data),
                item_id=item_id,
                user_id=user_id,
                transaction_type='TASK_REMOVAL',
                old_quantity=float(item.quantity),
                new_quantity=float(item.quantity),  # Quantity doesn't change in task removal
                old_state_id=old_state_id,
                new_state_id=new_state_id,
                old_location=old_location,
                new_location=new_location,
                transaction_data=json.dumps(transaction_data)
            )

            # Update item's state_id
            if item and new_state_id:
                item.state_id = new_state_id

            # Add transaction to current block
            current_block = self.add_transaction_to_block(transaction)
            db.session.commit()

            print(f"Task removal transaction {transaction.id} added to block {current_block.id}")
            return transaction

        except Exception as e:
            print(f"Error recording item task removal: {e}")
            db.session.rollback()
            raise

    def get_item_blockchain_history(self, item_id):
        """Get complete blockchain history for an item"""
        transactions = BlockchainTransaction.query.filter_by(item_id=item_id)\
            .order_by(BlockchainTransaction.timestamp.asc()).all()
        print(f"Retrieved {len(transactions)} transactions for item {item_id}")
        
        return [{
            'id': tx.id,
            'transaction_hash': tx.transaction_hash,
            'transaction_type': tx.transaction_type,
            'old_quantity': tx.old_quantity,
            'new_quantity': tx.new_quantity,
            'old_state': tx.old_state.to_dict() if tx.old_state else None,
            'new_state': tx.new_state.to_dict() if tx.new_state else None,
            'old_location': tx.old_location,
            'new_location': tx.new_location,
            'timestamp': tx.timestamp.isoformat(),
            'user': {
                'id': tx.user.id,
                'username': tx.user.username
            }
        } for tx in transactions]
    
    def get_item_current_state(self, item_id):
        """Get current blockchain state for an item"""
        from models import BlockchainItemState, ItemStateType
        
        # Use BlockchainItemState for the most accurate current state
        current_state = BlockchainItemState.query.filter_by(
            item_id=item_id,
            is_active=True
        ).first()
        
        if current_state:
            state_name = None
            if current_state.current_state_id:
                state = ItemStateType.query.get(current_state.current_state_id)
                state_name = state.state_name if state else None
                
            return {
                'item_id': item_id,
                'current_quantity': current_state.current_quantity,
                'current_state': current_state.current_state.to_dict() if current_state.current_state else None,
                'current_state_id': current_state.current_state_id,
                'current_state_name': state_name,
                'current_location': current_state.current_location,
                'last_updated': current_state.created_at.isoformat()
            }
        
        # Fallback to latest transaction if no BlockchainItemState found
        latest_tx = BlockchainTransaction.query.filter_by(item_id=item_id)\
            .order_by(BlockchainTransaction.timestamp.desc()).first()
        
        if not latest_tx:
            return None
        
        return {
            'item_id': item_id,
            'current_quantity': latest_tx.new_quantity,
            'current_state': latest_tx.new_state.to_dict() if latest_tx.new_state else None,
            'current_state_id': None,
            'current_state_name': None,
            'current_location': latest_tx.new_location,
            'last_transaction_hash': latest_tx.transaction_hash,
            'last_updated': latest_tx.timestamp.isoformat()
        }

    def get_item_state_at_block(self, item_id, transaction_id):
        """Get item state at a specific transaction using BlockchainItemState table"""
        try:
            print(f"Getting state for item {item_id} at transaction {transaction_id}")

            # Find the BlockchainItemState record for this specific transaction
            item_state = BlockchainItemState.query.filter_by(
                item_id=item_id,
                transaction_id=transaction_id
            ).first()

            if not item_state:
                print(f"No BlockchainItemState found for item {item_id} and transaction {transaction_id}")
                return None

            # Get the transaction details for additional context
            transaction = BlockchainTransaction.query.get(transaction_id)
            if not transaction:
                print(f"Transaction {transaction_id} not found")
                return None

            # Get the block information
            block = BlockchainBlock.query.get(transaction.block_id)


            # Get state information
            state_name = None
            if item_state.current_state_id:
                from models import ItemStateType
                state = ItemStateType.query.get(item_state.current_state_id)
                state_name = state.state_name if state else None

            return {
                'item_id': item_id,
                'block_id': transaction.block_id,
                'block_number': block.block_number if block else None,
                'quantity': item_state.current_quantity,
                'state_id': item_state.current_state_id,
                'current_state': item_state.current_state.to_dict() if item_state.current_state else None,
                'state_name': state_name,
                'location': item_state.current_location,
                'transaction': {
                    'id': transaction.id,
                    'transaction_hash': transaction.transaction_hash,
                    'transaction_type': transaction.transaction_type,
                    'user': {
                        'id': transaction.user.id,
                        'username': transaction.user.username
                    }
                },
                'block':{
                    'id': block.id if block else None,
                    'block_hash': block.block_hash if block else None,
                    'previous_hash': block.previous_hash if block else None,
                    'timestamp': block.timestamp.isoformat() if block else None,
                    'merkle_root': block.merkle_root if block else None,
                    'transaction_count': block.transaction_count if block else 0
                },
                'timestamp': transaction.timestamp.isoformat(),
                'is_active': item_state.is_active
            }

        except Exception as e:
            print(f"Error getting item state for transaction: {e}")
            import traceback
            traceback.print_exc()
            return None

    def record_item_scan(self, item_id, user_id, scan_count, timestamp=None):
        """
        Record a scan event for an item on the blockchain
        """
        if timestamp is None:
            timestamp = datetime.now()

        # Get the current item to populate quantity and state fields
        item = Item.query.get(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")

        transaction_id = generate_id('BCT', BlockchainTransaction)
        transaction_data = {
            'action': 'SCAN',
            'item_id': item_id,
            'user_id': user_id,
            'scan_count': scan_count,
            'timestamp': timestamp.isoformat(),
            'transaction_type': 'SCAN'
        }

        transaction_hash = self.calculate_transaction_hash(transaction_data, transaction_id, timestamp.isoformat())

        transaction = BlockchainTransaction(
            id=transaction_id,
            transaction_hash=transaction_hash,
            item_id=item_id,
            user_id=user_id,
            transaction_type='SCAN',
            old_quantity=float(item.quantity),
            new_quantity=float(item.quantity),  # Quantity doesn't change on scan
            old_state_id=item.state_id,
            new_state_id=item.state_id,  # State doesn't change on scan
            old_location=item.location,
            new_location=item.location,  # Location doesn't change on scan
            transaction_data=json.dumps(transaction_data)
        )

        current_block = self.add_transaction_to_block(transaction)
        db.session.commit()

        print(f"Scan transaction {transaction.id} added to block {current_block.id}")
        return transaction

    def record_task_state_changes(self, task_id: str, item_ids: list[str], user_id: str, target_state: str) -> tuple[list[dict], list[dict]]:
        """
        Record state changes for all items when a task state changes.
        Updates all items from their current state to the target state.

        Args:
            task_id: The task ID
            item_ids: List of item IDs to update
            user_id: User making the change
            target_state: Target state name ('Assigned to Worker', 'In Progress', 'Waiting T&C', 'Completed')

        Returns:
            tuple: (updated_items, blockchain_errors)
        """
        from models import Item, ItemStateType, BlockchainTransaction

        # Get the target state for items
        target_item_state = ItemStateType.query.filter_by(state_name=target_state).first()
        print(f"Target item state for '{target_state}': {target_item_state}")
        if not target_item_state:
            raise ValueError(f"Item state '{target_state}' not found")

        # Map task states to location suffixes
        location_mapping = {
            'Assigned to Worker': 'assigned-worker',
            'In Progress': 'in-progress',
            'Waiting T&C': 'waiting-tc',
            'Completed': 'completed'
        }

        location_suffix = location_mapping.get(target_state, 'unknown')

        updated_items = []
        blockchain_errors = []

        for item_id in item_ids:
            try:
                item = Item.query.get(item_id)
                if not item:
                    blockchain_errors.append({
                        'item_id': item_id,
                        'error': f'Item {item_id} not found'
                    })
                    continue

                old_state_id = item.state_id
                old_location = item.location
                new_location = f"task-{task_id}-{location_suffix}"

                print(f"Updating item {item_id} from state {old_state_id} to {target_item_state.id}")

                # Update item state to target state
                item.state_id = target_item_state.id
                item.location = new_location

                # Create transaction data
                ts = datetime.now()
                tx_id = generate_id("BCT", BlockchainTransaction)

                tx_data = {
                    "transaction_type": "TASK_STATE_CHANGE",
                    "item_id": item.id,
                    "task_id": task_id,
                    "user_id": user_id,
                    "old_state_id": old_state_id,
                    "new_state_id": target_item_state.id,
                    "old_location": old_location,
                    "new_location": new_location,
                    "target_state": target_state,
                    "reason": f"Task state changed - item state changed to {target_state}"
                }

                # Calculate transaction hash using the correct method signature
                tx_hash = self.calculate_transaction_hash(
                    tx_data,
                    transaction_id=tx_id,
                    timestamp=ts.isoformat()
                )

                # Create blockchain transaction
                tx = BlockchainTransaction(
                    id=tx_id,
                    transaction_hash=tx_hash,
                    item_id=item.id,
                    user_id=user_id,
                    transaction_type="TASK_STATE_CHANGE",
                    old_quantity=float(item.quantity),
                    new_quantity=float(item.quantity),
                    old_state_id=old_state_id,
                    new_state_id=target_item_state.id,
                    old_location=old_location,
                    new_location=new_location,
                    transaction_data=json.dumps(tx_data),
                )

                # Add transaction to blockchain
                self.add_transaction_to_block(tx)

                updated_items.append({
                    'item_id': item.id,
                    'old_state_id': old_state_id,
                    'new_state_id': target_item_state.id,
                    'new_location': new_location,
                    'target_state': target_state
                })

                print(f"Successfully updated item {item_id} to state {target_item_state.state_name}")

            except Exception as e:
                print(f"Error updating item {item_id}: {str(e)}")
                blockchain_errors.append({
                    'item_id': item_id,
                    'error': str(e)
                })

        # Commit all changes at once at the end
        try:
            db.session.commit()
            print(f"Successfully committed {len(updated_items)} item state changes")
        except Exception as e:
            print(f"Error committing changes: {str(e)}")
            db.session.rollback()
            raise

        return updated_items, blockchain_errors

    def record_label_print(self, item_id, user_id, label_count, task_id=None, label_data=None):
        """
        Record a label print event for an item on the blockchain
        """
        # Get the current item to populate quantity and state fields
        item = Item.query.get(item_id)
        if not item:
            raise ValueError(f"Item {item_id} not found")

        transaction_id = generate_id('BCT', BlockchainTransaction)
        timestamp = datetime.now()

        transaction_data = {
            'action': 'PRINT_LABEL',
            'item_id': item_id,
            'user_id': user_id,
            'label_count': label_count,
            'task_id': task_id,
            'label_data': label_data or item.label or item.id,
            'timestamp': timestamp.isoformat(),
            'transaction_type': 'PRINT_LABEL',
            'previous_label_count': (item.label_count or 0) - 1,  # Before increment
            'new_label_count': label_count
        }

        transaction_hash = self.calculate_transaction_hash(transaction_data, transaction_id, timestamp.isoformat())

        transaction = BlockchainTransaction(
            id=transaction_id,
            transaction_hash=transaction_hash,
            item_id=item_id,
            user_id=user_id,
            transaction_type='PRINT_LABEL',
            old_quantity=float(item.quantity),
            new_quantity=float(item.quantity),  # Quantity doesn't change on print
            old_state_id=item.state_id,
            new_state_id=item.state_id,  # State doesn't change on print
            old_location=item.location,
            new_location=item.location,  # Location doesn't change on print
            transaction_data=json.dumps(transaction_data)
        )

        current_block = self.add_transaction_to_block(transaction)
        db.session.commit()

        print(f"Label print transaction {transaction.id} added to block {current_block.id}")
        return transaction

    def record_bulk_label_print(self, items_data, user_id, task_id=None):
        """
        Record a bulk label print event for multiple items on the blockchain
        """
        transactions = []

        for item_info in items_data:
            item_id = item_info['item_id']
            label_count = item_info['label_count']
            label_data = item_info.get('label_data')

            # Get the current item
            item = Item.query.get(item_id)
            if not item:
                print(f"Warning: Item {item_id} not found, skipping blockchain record")
                continue

            transaction_id = generate_id('BCT', BlockchainTransaction)
            timestamp = datetime.now()

            transaction_data = {
                'action': 'BULK_PRINT_LABEL',
                'item_id': item_id,
                'user_id': user_id,
                'label_count': label_count,
                'task_id': task_id,
                'label_data': label_data or item.label or item.id,
                'timestamp': timestamp.isoformat(),
                'transaction_type': 'BULK_PRINT_LABEL',
                'previous_label_count': item_info.get('previous_label_count', 0),
                'new_label_count': label_count,
                'bulk_operation': True
            }

            transaction_hash = self.calculate_transaction_hash(transaction_data, transaction_id, timestamp.isoformat())

            transaction = BlockchainTransaction(
                id=transaction_id,
                transaction_hash=transaction_hash,
                item_id=item_id,
                user_id=user_id,
                transaction_type='BULK_PRINT_LABEL',
                old_quantity=float(item.quantity),
                new_quantity=float(item.quantity),  # Quantity doesn't change on print
                old_state_id=item.state_id,
                new_state_id=item.state_id,  # State doesn't change on print
                old_location=item.location,
                new_location=item.location,  # Location doesn't change on print
                transaction_data=json.dumps(transaction_data)
            )

            current_block = self.add_transaction_to_block(transaction)
            transactions.append(transaction)

        db.session.commit()

        print(f"Bulk label print: {len(transactions)} transactions recorded")
        return transactions
