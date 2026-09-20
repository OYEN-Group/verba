import os
import uuid
import tempfile
import fitz  # PyMuPDF
from supabase import create_client, Client

class PDFProcessor:
    def __init__(self, pdf_bytes: bytes, user_id: str = None, document_id: str = None):
        self.pdf_bytes = pdf_bytes
        self.user_id = user_id
        self.document_id = document_id
        
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        self.temp_file.write(self.pdf_bytes)
        self.temp_file.flush()
        self.pdf_path = self.temp_file.name
        
        # Initialize Supabase client if credentials are provided
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
        if supabase_url and supabase_key:
            self.supabase: Client = create_client(supabase_url, supabase_key)
        else:
            self.supabase = None

    def parse_to_json(self) -> dict:
        """Parses the PDF and returns a JSON representation mapping paragraphs and runs."""
        try:
            blocks = []
            
            with fitz.open(self.pdf_path) as pdf:
                for page_num in range(len(pdf)):
                    page = pdf[page_num]
                    # get_text("blocks") returns:
                    # (x0, y0, x1, y1, "lines in block", block_no, block_type)
                    # block_type == 0 for text, 1 for image
                    page_blocks = page.get_text("blocks")
                    
                    # Sort blocks heuristically by Y coordinate then X coordinate
                    # to roughly approximate reading order, though this won't perfectly solve complex 2-column layouts
                    page_blocks.sort(key=lambda b: (b[1], b[0]))
                    
                    for b in page_blocks:
                        block_type_val = b[6] if len(b) >= 7 else 0
                        
                        # TEXT BLOCK
                        if block_type_val == 0:
                            text = b[4]
                            
                            # Clean up the text: replace newlines with spaces to join the paragraph properly
                            p_text = " ".join(text.split("\n")).strip()
                            
                            if not p_text:
                                continue
                            
                            block_id = str(uuid.uuid4())
                            
                            # Treat short lines as potential headings
                            block_type = "paragraph"
                            style_name = "Normal"
                            if len(p_text) < 100 and not p_text.endswith("."):
                                block_type = "heading"
                                style_name = "Heading1"
                            
                            block_data = {
                                "id": block_id,
                                "type": block_type,
                                "style": style_name,
                                "text": p_text,
                                "runs": [
                                    {
                                        "text": p_text,
                                        "bold": block_type == "heading",
                                        "italic": False
                                    }
                                ]
                            }
                            
                            if block_type == "heading":
                                block_data["level"] = 1
                                
                            blocks.append(block_data)
                            
                        # IMAGE BLOCK
                        elif block_type_val == 1:
                            # Extract the image using the block's bbox
                            bbox = fitz.Rect(b[:4])
                            pix = page.get_pixmap(clip=bbox)
                            image_bytes = pix.tobytes("png")
                            
                            asset_id = str(uuid.uuid4())
                            asset_path = f"{self.user_id}/{self.document_id}/assets/{asset_id}.png" if self.user_id and self.document_id else f"assets/{asset_id}.png"
                            
                            # Upload to Supabase if configured
                            if self.supabase:
                                try:
                                    self.supabase.storage.from_("documents").upload(
                                        path=asset_path,
                                        file=image_bytes,
                                        file_options={"content-type": "image/png"}
                                    )
                                except Exception as e:
                                    # Log upload error or handle it
                                    pass
                            
                            block_id = str(uuid.uuid4())
                            block_data = {
                                "id": block_id,
                                "type": "paragraph",
                                "style": "Normal",
                                "text": "",
                                "runs": [
                                    {
                                        "type": "image",
                                        "assetId": asset_id,
                                        "storagePath": asset_path,
                                        "contentType": "image/png"
                                    }
                                ]
                            }
                            blocks.append(block_data)

            if not blocks:
                return {"error": "Invalid PDF format: no readable content found"}

            # Match the DOCX AST structure
            return {
                "version": 1,
                "sourceFormat": "pdf",
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
        except Exception as e:
            return {"error": f"Failed to parse PDF: {str(e)}"}

    def cleanup(self):
        try:
            self.temp_file.close()
            import os
            if os.path.exists(self.pdf_path):
                os.remove(self.pdf_path)
        except Exception:
            pass
