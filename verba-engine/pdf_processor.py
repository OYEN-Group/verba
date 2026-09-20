import uuid
import tempfile
import pdfplumber

class PDFProcessor:
    def __init__(self, pdf_bytes: bytes):
        self.pdf_bytes = pdf_bytes
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        self.temp_file.write(self.pdf_bytes)
        self.temp_file.flush()
        self.pdf_path = self.temp_file.name

    def parse_to_json(self) -> dict:
        """Parses the PDF and returns a JSON representation mapping paragraphs and runs."""
        try:
            blocks = []
            
            with pdfplumber.open(self.pdf_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    text = page.extract_text()
                    if text:
                        # Split by double newline for simple paragraph detection
                        paragraphs = text.split("\n\n")
                        for p_text in paragraphs:
                            p_text = p_text.replace("\n", " ").strip()
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

            if not blocks:
                return {"error": "Invalid PDF format: no readable text found"}

            return {
                "documentId": str(uuid.uuid4()),
                "title": "Uploaded PDF Document",
                "sections": [
                    {
                        "id": str(uuid.uuid4()),
                        "blocks": blocks
                    }
                ]
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
