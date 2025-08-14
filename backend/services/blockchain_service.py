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

    def calculate_transaction_hash(self, transaction_data):
        """Calculate SHA256 hash of transaction data"""
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
        from models import BlockchainItemState

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
            current_status=transaction.new_status or 'unknown',
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
        transaction_data = {
            'item_id': item_id,
            'transaction_type': 'CREATE',
            'old_quantity': 0,
            'new_quantity': quantity,
            'old_status': None,
            'new_status': 'available',
            'old_location': None,
            'new_location': None,
            'user_id': user_id
        }
        print(f"Recording item creation: {transaction_data}")
        transaction_hash = self.calculate_transaction_hash(transaction_data)

        transaction = BlockchainTransaction(
            id=generate_id('BCT', BlockchainTransaction),
            transaction_hash=transaction_hash,
            item_id=item_id,
            user_id=user_id,
            transaction_type='CREATE',
            old_quantity=0,
            new_quantity=quantity,
            old_status=None,
            new_status='available',
            transaction_data=json.dumps(transaction_data)
        )
        
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
            old_status='available',
            new_status='available',
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
            old_status=None,
            new_status='available',  # Initially available, will be assigned later
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
                old_status=parent_tx.old_status,
                new_status=parent_tx.new_status,
                old_location=parent_tx.old_location,
                new_location=parent_tx.new_location,
                transaction_data=json.dumps(inheritance_data)
            )

            self.add_transaction_to_block(inheritance_tx)

    def record_item_assignment(self, item_id, task_id, user_id):
        """Record item assignment to task on blockchain"""
        item = Item.query.get(item_id)
        
        transaction_data = {
            'item_id': item_id,
            'task_id': task_id,
            'user_id': user_id
        }
        print(f"Recording item assignment: {transaction_data}")

        transaction = BlockchainTransaction(
            id=generate_id('BCT', BlockchainTransaction),
            transaction_hash=self.calculate_transaction_hash(transaction_data),
            item_id=item_id,
            user_id=user_id,
            transaction_type='ASSIGN',
            old_quantity=item.quantity if item else 0,
            new_quantity=item.quantity if item else 0,
            old_status='available',
            new_status='assigned',
            new_location=f"task-{task_id}",
            transaction_data=json.dumps(transaction_data)
        )
        
        current_block = self.add_transaction_to_block(transaction)
        db.session.commit()

        print(f"Assignment transaction {transaction.id} added to block {current_block.id}")
        return transaction
    
    def record_item_task_removal(self, item_id, task_id, old_status, new_status, old_task_ids, new_task_ids, user_id):
        """Record item task removal transaction on blockchain"""
        try:
            item = Item.query.get(item_id)
            if not item:
                raise ValueError(f"Item {item_id} not found")

            transaction_data = {
                'item_id': item_id,
                'task_id': task_id,
                'transaction_type': 'TASK_REMOVAL',
                'old_status': old_status,
                'new_status': new_status,
                'old_task_ids': old_task_ids,
                'new_task_ids': new_task_ids,
                'user_id': user_id,
                'quantity': float(item.quantity)
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
                old_status=old_status,
                new_status=new_status,
                old_location=old_location,
                new_location=new_location,
                transaction_data=json.dumps(transaction_data)
            )

            # Add transaction to current block
            current_block = self.add_transaction_to_block(transaction)

            # Create item state record
            item_state = BlockchainItemState(
                id=generate_id('BIS', BlockchainItemState),
                item_id=item_id,
                transaction_id=transaction.id,
                current_quantity=float(item.quantity),
                current_status=new_status,
                current_location=new_location,
                is_active=True
            )

            db.session.add(item_state)
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
            'old_status': tx.old_status,
            'new_status': tx.new_status,
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
        latest_tx = BlockchainTransaction.query.filter_by(item_id=item_id)\
            .order_by(BlockchainTransaction.timestamp.desc()).first()
        
        if not latest_tx:
            return None
        
        return {
            'item_id': item_id,
            'current_quantity': latest_tx.new_quantity,
            'current_status': latest_tx.new_status,
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

            return {
                'item_id': item_id,
                'block_id': transaction.block_id,
                'block_number': block.block_number if block else None,
                'quantity': item_state.current_quantity,
                'status': item_state.current_status,
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
