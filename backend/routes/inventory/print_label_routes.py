from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Task, Item, MaterialType
from __init__ import db
import io
import qrcode
from barcode import Code128
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont
import base64

print_label_bp = Blueprint('print_label', __name__)


@print_label_bp.route('/items/<string:item_id>/print', methods=['POST'])
@jwt_required()
def print_item_label(item_id):
    """
    Generate PDF label for an item and increment label count
    """
    try:
        item = Item.query.get_or_404(item_id)
        material_type = item.material_type
        
        # Get task info from request
        data = request.get_json() or {}
        task_id = data.get('task_id', 'UNKNOWN')
        
        # Generate barcode data (used for both barcode and QR code)
        barcode_data = item.label or f"{task_id.replace('TSK', '')}-{item.id.replace('ITM', '')}"
        
        # Increment label count
        if item.label_count is None:
            item.label_count = 1
        else:
            item.label_count += 1
        
        db.session.commit()
        
        # Create PDF in memory
        pdf_buffer = io.BytesIO()
        
        # Create a new image with PIL for the label
        label_width = 300
        label_height = 200
        img = Image.new('RGB', (label_width, label_height), color='white')
        draw = ImageDraw.Draw(img)
        
        try:
            # Try to use a Chinese font, fallback to default if not available
            font_path = "C:/Windows/Fonts/simhei.ttf"  # Chinese font for Windows
            font_title = ImageFont.truetype(font_path, 16)
            font_normal = ImageFont.truetype(font_path, 12)
            font_small = ImageFont.truetype(font_path, 10)
        except Exception:
            # Fallback to default font if custom font fails
            font_title = ImageFont.load_default()
            font_normal = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Generate QR code for item and task (use same data as barcode)
        qr = qrcode.QRCode(version=1, box_size=3, border=1)
        qr.add_data(barcode_data)
        qr.make(fit=True)
        qr_img = qr.make_image(fill_color="black", back_color="white")
        qr_img = qr_img.resize((60, 60))
        
        # Paste QR code onto label image
        img.paste(qr_img, (10, 10))
        
        # Generate barcode for the item
        barcode_buffer = io.BytesIO()
        barcode = Code128(barcode_data, writer=ImageWriter())
        barcode.write(barcode_buffer)
        barcode_buffer.seek(0)
        barcode_img = Image.open(barcode_buffer)
        barcode_img = barcode_img.resize((200, 60))
        
        # Paste barcode onto label
        img.paste(barcode_img, (80, 10))
        
        # Add text information
        y_offset = 80
        draw.text((10, y_offset), f"物品: {material_type.material_name}", fill='black', font=font_normal)
        y_offset += 20
        draw.text((10, y_offset), f"編號: {item.id}", fill='black', font=font_normal)
        y_offset += 20
        draw.text((10, y_offset), f"數量: {item.quantity} {material_type.material_unit}", fill='black', font=font_normal)
        y_offset += 20
        draw.text((10, y_offset), f"標籤: {barcode_data}", fill='black', font=font_normal)
        
        # Save as PDF
        img.save(pdf_buffer, format='PDF', quality=95)
        pdf_buffer.seek(0)
        
        # Return PDF file
        return send_file(
            io.BytesIO(pdf_buffer.getvalue()),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{item.id}-label.pdf'
        )
    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({'error': 'Failed to generate label', 'details': str(e)}), 500

@print_label_bp.route('/tasks/<string:task_id>/print-all', methods=['POST'])
@jwt_required()
def print_all_task_items(task_id):
    """
    Generate a single PDF with items for a task based on filter criteria
    """
    try:
        # Verify task exists
        task = Task.query.get_or_404(task_id)

        # Get filter parameter from request
        data = request.get_json() or {}
        show_printed = data.get('show_printed', False)
        
        # Get items through task_item relationship
        from models import Item
        import json
        # Get all items and filter in Python for those with this task_id in their task_ids JSON list
        all_items = Item.query.all()
        task_items = []
        for item in all_items:
            try:
                task_ids = json.loads(item.task_ids) if item.task_ids else []
            except Exception:
                task_ids = []
            if task_id in task_ids:
                task_items.append(item)

        items_data = []
        for item in task_items:
            material_type = item.material_type

            # Apply filter based on show_printed parameter
            if not show_printed and (item.label_count or 0) > 0:
                continue

            barcode_data = item.label or f"{task_id.replace('TSK', '')}-{item.id.replace('ITM', '')}"

            # Increment label count for each item
            if item.label_count is None:
                item.label_count = 1
            else:
                item.label_count += 1

            items_data.append({
                'item': item,
                'material_type': material_type,
                'barcode_data': barcode_data
            })

        if not items_data:
            return jsonify({'error': 'No items found matching criteria'}), 404
        
        db.session.commit()
        
        # Create PDF with filtered items
        pdf_buffer = io.BytesIO()
        
        # Calculate dimensions for multiple labels
        labels_per_page = 4
        label_width = 300
        label_height = 200
        page_width = 600
        page_height = 400
        
        # Create a new image for the combined PDF
        total_pages = (len(items_data) + labels_per_page - 1) // labels_per_page
        
        # Create a list to hold each page image
        page_images = []
        for page_num in range(total_pages):
            page_img = Image.new('RGB', (page_width, page_height), color='white')
            page_draw = ImageDraw.Draw(page_img)
            try:
                font_path = "C:/Windows/Fonts/simhei.ttf"
                font_title = ImageFont.truetype(font_path, 14)
                font_normal = ImageFont.truetype(font_path, 11)
                font_small = ImageFont.truetype(font_path, 9)
            except Exception:
                font_title = ImageFont.load_default()
                font_normal = ImageFont.load_default()
                font_small = ImageFont.load_default()
            for label_on_page in range(labels_per_page):
                index = page_num * labels_per_page + label_on_page
                if index >= len(items_data):
                    break
                item_data = items_data[index]
                item = item_data['item']
                material_type = item_data['material_type']
                barcode_data = item_data['barcode_data']
                # 2x2 grid layout
                col = label_on_page % 2
                row = label_on_page // 2
                x_offset = col * label_width + (page_width - 2 * label_width) // 3
                y_offset = row * label_height + 20
                # Generate QR code
                qr = qrcode.QRCode(version=1, box_size=2, border=1)
                qr.add_data(barcode_data)
                qr.make(fit=True)
                qr_img = qr.make_image(fill_color="black", back_color="white")
                qr_img = qr_img.resize((50, 50))
                page_img.paste(qr_img, (x_offset + 10, y_offset + 10))
                # Generate barcode
                barcode_buffer = io.BytesIO()
                barcode = Code128(barcode_data, writer=ImageWriter())
                barcode.write(barcode_buffer)
                barcode_buffer.seek(0)
                barcode_img = Image.open(barcode_buffer)
                barcode_img = barcode_img.resize((180, 40))
                page_img.paste(barcode_img, (x_offset + 70, y_offset + 10))
                # Add text information
                page_draw.text((x_offset + 10, y_offset + 60), f"物品: {material_type.material_name}", fill='black', font=font_normal)
                page_draw.text((x_offset + 10, y_offset + 75), f"編號: {item.id}", fill='black', font=font_normal)
                page_draw.text((x_offset + 10, y_offset + 90), f"數量: {item.quantity} {material_type.material_unit}", fill='black', font=font_normal)
                page_draw.text((x_offset + 10, y_offset + 105), f"標籤: {barcode_data}", fill='black', font=font_small)
                page_draw.rectangle([x_offset, y_offset, x_offset + label_width - 5, y_offset + label_height - 5], outline='black', width=1)
            page_images.append(page_img)
        # Save all pages as a multi-page PDF
        page_images[0].save(pdf_buffer, format='PDF', save_all=True, append_images=page_images[1:], quality=95)
        pdf_buffer.seek(0)
        
        # Return combined PDF file
        return send_file(
            io.BytesIO(pdf_buffer.getvalue()),
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'{task_id}-all-labels.pdf'
        )
    
    except Exception as e:
        db.session.rollback()
        print(e)
        return jsonify({'error': 'Failed to generate combined PDF', 'details': str(e)}), 500

@print_label_bp.route('/items/<string:item_id>', methods=['GET'])
@jwt_required()
def get_item_detail(item_id):
    """
    Get detailed information for a single item including QR/barcode data
    """
    try:
        item = Item.query.get_or_404(item_id)
        material_type = item.material_type
        
        # Get task IDs
        task_ids = []
        if item.task_ids:
            import json
            try:
                task_ids = json.loads(item.task_ids)
            except:
                task_ids = []
        
        return jsonify({
            'item_id': item.id,
            'material_type': material_type.material_name,
            'material_unit': material_type.material_unit,
            'item_quantity': item.quantity,
            'label_count': item.label_count or 0,
            'label': item.label or item.id,
            'task_ids': task_ids,
            'status': item.status
        })
    
    except Exception as e:
        return jsonify({'error': 'Failed to fetch item details', 'details': str(e)}), 500