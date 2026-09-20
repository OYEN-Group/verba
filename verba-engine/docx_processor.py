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
        sections = []
        current_blocks = []
        
        # Get column count from a section XML element
        def get_columns_from_sectPr(sectPr):
            if sectPr is not None:
                cols = sectPr.xpath('./w:cols/@w:num')
                if cols and len(cols) > 0:
                    try:
                        return int(cols[0])
                    except ValueError:
                        pass
            return 1

        try:
            # We'll map the document into one or more AST sections.
            # python-docx holds sections in `self.doc.sections`.
            # Typically, w:sectPr elements inside paragraphs mark section breaks.
            # The final section is stored at self.doc.element.body.sectPr.
            
            # Simple approach: build AST sections when we detect a section break.
            current_columns = 1
            
            # For the first section, it will use the properties of the first section in doc.sections
            if len(self.doc.sections) > 0:
                current_columns = get_columns_from_sectPr(self.doc.sections[0]._sectPr)
                
            for block in self.iter_block_items(self.doc):
                if isinstance(block, Paragraph):
                    # Check if this paragraph contains a section break
                    sectPr = block._p.pPr.sectPr if block._p.pPr is not None else None
                    if sectPr is not None:
                        # This paragraph ends the current section
                        if block.text.strip():
                            current_blocks.append(self.process_paragraph(block))
                            
                        # Commit the current section
                        if current_blocks:
                            sections.append({
                                "id": str(uuid.uuid4()),
                                "layout": { "type": "multi-column" if current_columns > 1 else "single-column", "columns": min(current_columns, 2) },
                                "blocks": current_blocks
                            })
                            current_blocks = []
                            
                        # The next blocks will belong to the next section
                        # But wait, in DOCX the section break defines the properties of the PRECEDING text.
                        # So the sectPr we just found applies to `current_blocks`.
                        # However, for simplicity and forward compatibility, let's just grab the next section's cols.
                        # We can just read the next section from self.doc.sections.
                        pass
                    else:
                        if block.text.strip() or block._p.xpath('.//a:blip'):
                            current_blocks.append(self.process_paragraph(block))
                            
                elif isinstance(block, Table):
                    current_blocks.append(self.process_table(block))
            
            # Commit the final section (which takes the document-level sectPr)
            if current_blocks:
                final_sectPr = self.doc.element.body.sectPr
                final_columns = get_columns_from_sectPr(final_sectPr)
                # If we only have 1 section overall, we can just use doc.sections[0] columns
                if len(sections) == 0 and len(self.doc.sections) > 0:
                    final_columns = get_columns_from_sectPr(self.doc.sections[0]._sectPr)
                    
                sections.append({
                    "id": str(uuid.uuid4()),
                    "layout": { "type": "multi-column" if final_columns > 1 else "single-column", "columns": min(final_columns, 2) },
                    "blocks": current_blocks
                })
            
            # Construct VerbaDocumentAST
            ast = {
                "version": 1,
                "sourceFormat": "docx",
                "importMode": "layout_preserved",
                "sections": sections,
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
