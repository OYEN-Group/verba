import os
import tempfile
import uuid
from typing import List, Dict, Any

from docx import Document
from docx.document import Document as _Document
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.table import _Cell, Table
from docx.text.paragraph import Paragraph

from supabase import create_client, Client

class DOCXProcessor:
    def __init__(self, docx_bytes: bytes, user_id: str = None, document_id: str = None):
        self.docx_bytes = docx_bytes
        self.user_id = user_id
        self.document_id = document_id
        
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".docx")
        self.temp_file.write(self.docx_bytes)
        self.temp_file.flush()
        
        self.doc = Document(self.temp_file.name)
        
        # Initialize Supabase client if credentials are provided
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and supabase_key:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        else:
            self.supabase = None

    def iter_block_items(self, parent):
        """Yield each paragraph and table child within *parent*, in document order."""
        if isinstance(parent, _Document):
            parent_elm = parent.element.body
        elif isinstance(parent, _Cell):
            parent_elm = parent._tc
        else:
            raise ValueError("Something's not right")
            
        for child in parent_elm.iterchildren():
            if isinstance(child, CT_P):
                yield Paragraph(child, parent)
            elif isinstance(child, CT_Tbl):
                yield Table(child, parent)

    def process_paragraph(self, p: Paragraph) -> Dict[str, Any]:
        style_name = p.style.name if p.style else "Normal"
        block_type = "paragraph"
        level = None
        
        if style_name.startswith("Heading"):
            block_type = "heading"
            try:
                level = int(style_name.replace("Heading ", "").replace("Heading", ""))
            except ValueError:
                level = 1
                
        if p.style and "List" in p.style.name:
            block_type = "list"
                
        runs = []
        for r in p.runs:
            # Check for images in the run
            blips = r.element.xpath('.//a:blip')
            for blip in blips:
                rId = blip.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}embed')
                if rId:
                    part = p.part.related_parts[rId]
                    image_bytes = part.blob
                    ext = part.content_type.split('/')[-1] if '/' in part.content_type else 'png'
                    if ext == 'jpeg': ext = 'jpg'
                    
                    asset_id = str(uuid.uuid4())
                    asset_path = f"{self.user_id}/{self.document_id}/assets/{asset_id}.{ext}" if self.user_id and self.document_id else f"assets/{asset_id}.{ext}"
                    
                    # Upload to Supabase if configured
                    if self.supabase:
                        try:
                            self.supabase.storage.from_("documents").upload(
                                path=asset_path,
                                file=image_bytes,
                                file_options={"content-type": part.content_type}
                            )
                        except Exception as e:
                            # Log upload error or handle it
                            pass
                            
                    runs.append({
                        "type": "image",
                        "assetId": asset_id,
                        "storagePath": asset_path,
                        "contentType": part.content_type
                    })

            if r.text:
                runs.append({
                    "text": r.text,
                    "bold": bool(r.bold),
                    "italic": bool(r.italic)
                })
            
        return {
            "id": str(uuid.uuid4()),
            "type": block_type,
            "style": style_name,
            "level": level,
            "text": p.text,
            "runs": runs
        }

    def process_table(self, table: Table) -> Dict[str, Any]:
        rows = []
        for r_idx, row in enumerate(table.rows):
            cells = []
            for c_idx, cell in enumerate(row.cells):
                # Basic cell processing - merge all paragraphs in cell
                cell_text = "\n".join([p.text for p in cell.paragraphs])
                cells.append({
                    "text": cell_text
                })
            rows.append({
                "type": "table-header" if r_idx == 0 else "table-row",
                "cells": cells
            })
            
        return {
            "id": str(uuid.uuid4()),
            "type": "table",
            "rows": rows
        }

    def parse_to_json(self) -> dict:
        """Parses the DOCX and returns a VerbaDocumentAST JSON."""
        blocks = []
        
        try:
            for block in self.iter_block_items(self.doc):
                if isinstance(block, Paragraph):
                    # Skip empty paragraphs
                    if not block.text.strip():
                        continue
                    blocks.append(self.process_paragraph(block))
                elif isinstance(block, Table):
                    blocks.append(self.process_table(block))
            
            # Construct VerbaDocumentAST
            ast = {
                "version": 1,
                "sourceFormat": "docx",
                "importMode": "layout_preserved",
                "sections": [
                    {
                        "id": str(uuid.uuid4()),
                        "layout": { "type": "single-column" },
                        "blocks": blocks
                    }
                ],
                "assets": []
            }
            
            return ast
            
        except Exception as e:
            return {"error": f"Failed to parse DOCX: {str(e)}"}

    def cleanup(self):
        try:
            self.temp_file.close()
            if os.path.exists(self.temp_file.name):
                os.remove(self.temp_file.name)
        except Exception:
            pass
