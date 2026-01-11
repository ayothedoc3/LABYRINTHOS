"""
AI/OCR Routes
Document scanning, text extraction, and intelligent form intake
"""
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
import os
import base64

router = APIRouter(prefix="/ai-ocr", tags=["AI/OCR"])

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL')
db_name = os.environ.get('DB_NAME', 'labyrinth_db')

if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    documents_collection = db["scanned_documents"]
    extractions_collection = db["extracted_data"]
else:
    documents_collection = None
    extractions_collection = None

# In-memory fallback
documents_db = {}
extractions_db = {}

# Import AI service for intelligent processing
from ai_service import AIService

# ==================== MODELS ====================

class DocumentScan(BaseModel):
    document_type: str  # "invoice", "receipt", "contract", "form", "id"
    image_base64: Optional[str] = None
    image_url: Optional[str] = None

class ExtractionResult(BaseModel):
    document_id: str
    document_type: str
    extracted_fields: dict
    confidence_score: float
    raw_text: str
    processing_time_ms: int

class SmartFormIntake(BaseModel):
    form_type: str  # "client_onboarding", "contract_details", "expense_report"
    raw_input: str  # Unstructured text input

class FieldMapping(BaseModel):
    source_field: str
    target_field: str
    transform: Optional[str] = None  # "uppercase", "lowercase", "date_format"

# ==================== HELPERS ====================

def doc_to_dict(doc: dict) -> dict:
    return {k: v for k, v in doc.items() if k != "_id"}

# ==================== OCR SIMULATION ====================

# Note: For production, integrate with actual OCR services like:
# - Google Cloud Vision API
# - AWS Textract
# - Azure Computer Vision
# - Tesseract (self-hosted)

MOCK_OCR_RESULTS = {
    "invoice": {
        "vendor_name": "Acme Corp",
        "invoice_number": "INV-2026-0042",
        "invoice_date": "2026-01-10",
        "due_date": "2026-02-10",
        "total_amount": 4500.00,
        "line_items": [
            {"description": "Consulting Services", "quantity": 10, "unit_price": 350.00, "total": 3500.00},
            {"description": "Travel Expenses", "quantity": 1, "unit_price": 1000.00, "total": 1000.00}
        ],
        "payment_terms": "Net 30",
        "currency": "USD"
    },
    "receipt": {
        "merchant_name": "Office Supplies Co",
        "receipt_date": "2026-01-09",
        "total_amount": 125.50,
        "items": [
            {"name": "Printer Paper (5 reams)", "price": 45.00},
            {"name": "Ink Cartridges", "price": 65.00},
            {"name": "Sticky Notes", "price": 15.50}
        ],
        "payment_method": "Corporate Card",
        "tax_amount": 10.50
    },
    "contract": {
        "contract_title": "Service Agreement",
        "parties": ["Labyrinth Inc", "Client Company LLC"],
        "effective_date": "2026-01-15",
        "term_length": "12 months",
        "total_value": 150000.00,
        "key_terms": [
            "Monthly deliverables review",
            "Quarterly performance assessment",
            "60-day termination notice"
        ],
        "signatures_required": 2
    },
    "form": {
        "form_type": "Application Form",
        "applicant_name": "John Smith",
        "email": "john.smith@example.com",
        "phone": "+1 555-123-4567",
        "address": "123 Main St, City, ST 12345",
        "submission_date": "2026-01-10"
    },
    "id": {
        "document_type": "Driver License",
        "full_name": "Jane Doe",
        "date_of_birth": "1985-06-15",
        "id_number": "D12345678",
        "expiration_date": "2028-06-15",
        "issuing_state": "California"
    }
}

# ==================== OCR ENDPOINTS ====================

@router.post("/scan")
async def scan_document(scan_request: DocumentScan):
    """Scan a document and extract text/data using OCR"""
    
    import time
    start_time = time.time()
    
    document_id = f"doc_{uuid.uuid4().hex[:8]}"
    
    # In production, this would:
    # 1. Decode the base64 image or fetch from URL
    # 2. Send to OCR service (Google Vision, AWS Textract, etc.)
    # 3. Process and structure the extracted text
    
    # For demo, use mock data based on document type
    doc_type = scan_request.document_type.lower()
    extracted_data = MOCK_OCR_RESULTS.get(doc_type, {
        "raw_text": "Sample extracted text from document",
        "fields_detected": []
    })
    
    processing_time = int((time.time() - start_time) * 1000) + 150  # Simulate processing time
    
    # Calculate confidence (mock)
    confidence = 0.92 if doc_type in MOCK_OCR_RESULTS else 0.75
    
    document_record = {
        "id": document_id,
        "document_type": doc_type,
        "extracted_fields": extracted_data,
        "confidence_score": confidence,
        "raw_text": f"[Simulated OCR text for {doc_type}]",
        "processing_time_ms": processing_time,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "processed"
    }
    
    if documents_collection is not None:
        await documents_collection.insert_one(document_record)
    else:
        documents_db[document_id] = document_record
    
    return {
        "message": "Document scanned successfully",
        "document_id": document_id,
        "document_type": doc_type,
        "extracted_fields": extracted_data,
        "confidence_score": confidence,
        "processing_time_ms": processing_time
    }

@router.get("/documents")
async def list_scanned_documents(
    document_type: Optional[str] = None,
    limit: int = 50
):
    """List all scanned documents"""
    
    if documents_collection is not None:
        query = {}
        if document_type:
            query["document_type"] = document_type.lower()
        cursor = documents_collection.find(query, {"_id": 0}).sort("created_at", -1).limit(limit)
        documents = await cursor.to_list(length=limit)
    else:
        documents = list(documents_db.values())
        if document_type:
            documents = [d for d in documents if d["document_type"] == document_type.lower()]
        documents = sorted(documents, key=lambda x: x["created_at"], reverse=True)[:limit]
    
    return {"documents": documents, "total": len(documents)}

@router.get("/documents/{document_id}")
async def get_document(document_id: str):
    """Get scanned document details"""
    
    if documents_collection is not None:
        doc = await documents_collection.find_one({"id": document_id}, {"_id": 0})
    else:
        doc = documents_db.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return doc

# ==================== SMART FORM INTAKE ====================

@router.post("/smart-intake")
async def smart_form_intake(intake: SmartFormIntake):
    """Use AI to parse unstructured text into structured form data"""
    
    form_schemas = {
        "client_onboarding": {
            "fields": ["company_name", "contact_name", "email", "phone", "industry", "company_size", "address"],
            "description": "Client onboarding information"
        },
        "contract_details": {
            "fields": ["contract_title", "client_name", "start_date", "end_date", "value", "scope", "deliverables"],
            "description": "Contract and agreement details"
        },
        "expense_report": {
            "fields": ["employee_name", "date", "category", "amount", "description", "receipt_attached"],
            "description": "Expense report submission"
        }
    }
    
    schema = form_schemas.get(intake.form_type)
    if not schema:
        raise HTTPException(status_code=400, detail=f"Unknown form type: {intake.form_type}")
    
    prompt = f"""Parse the following unstructured text into a structured form.

Form Type: {intake.form_type}
Expected Fields: {', '.join(schema['fields'])}

Input Text:
{intake.raw_input}

Extract the relevant information and return it as JSON with the field names as keys.
If a field cannot be determined from the input, set it to null.
Also include a "parsing_notes" field with any observations about the parsing.

Return ONLY valid JSON."""

    try:
        ai = AIService(provider="openai", model="gpt-4o-mini")
        response = await ai.generate(
            prompt=prompt,
            system_message="You are a data extraction assistant. Parse unstructured text into structured form data. Always respond with valid JSON only."
        )
        
        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            parsed_data = json.loads(json_match.group())
        else:
            parsed_data = {"error": "Could not parse response", "raw_response": response}
        
        extraction_id = f"extract_{uuid.uuid4().hex[:8]}"
        
        extraction_record = {
            "id": extraction_id,
            "form_type": intake.form_type,
            "raw_input": intake.raw_input,
            "parsed_data": parsed_data,
            "schema_fields": schema["fields"],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        if extractions_collection is not None:
            await extractions_collection.insert_one(extraction_record)
        else:
            extractions_db[extraction_id] = extraction_record
        
        return {
            "message": "Form parsed successfully",
            "extraction_id": extraction_id,
            "form_type": intake.form_type,
            "parsed_data": parsed_data,
            "expected_fields": schema["fields"],
            "fields_found": [k for k in parsed_data.keys() if k in schema["fields"]]
        }
        
    except Exception as e:
        return {
            "message": "Parsing failed",
            "error": str(e),
            "form_type": intake.form_type
        }

# ==================== AI DATA VALIDATION ====================

@router.post("/validate-extraction/{document_id}")
async def validate_extraction(document_id: str):
    """Use AI to validate and enhance extracted data"""
    
    if documents_collection is not None:
        doc = await documents_collection.find_one({"id": document_id}, {"_id": 0})
    else:
        doc = documents_db.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    extracted_fields = doc.get("extracted_fields", {})
    
    prompt = f"""Validate and enhance the following extracted document data.

Document Type: {doc.get('document_type')}
Extracted Data: {extracted_fields}

Check for:
1. Data consistency (dates make sense, numbers are valid)
2. Missing critical fields
3. Potential errors or typos
4. Suggested corrections

Return JSON with:
{{
    "is_valid": true/false,
    "confidence_score": 0-1,
    "issues_found": ["list of issues"],
    "suggested_corrections": {{"field": "corrected_value"}},
    "missing_fields": ["list of missing important fields"],
    "validation_notes": "summary"
}}"""

    try:
        ai = AIService(provider="openai", model="gpt-4o-mini")
        response = await ai.generate(
            prompt=prompt,
            system_message="You are a data validation expert. Analyze extracted document data for accuracy and completeness. Return valid JSON."
        )
        
        import json
        import re
        json_match = re.search(r'\{[\s\S]*\}', response)
        if json_match:
            validation_result = json.loads(json_match.group())
        else:
            validation_result = {"error": "Could not parse validation response"}
        
        return {
            "document_id": document_id,
            "document_type": doc.get("document_type"),
            "original_data": extracted_fields,
            "validation": validation_result
        }
        
    except Exception as e:
        return {
            "document_id": document_id,
            "error": str(e)
        }

# ==================== TEMPLATE MATCHING ====================

@router.post("/match-template")
async def match_document_template(document_id: str):
    """Match document to known templates for better extraction"""
    
    if documents_collection is not None:
        doc = await documents_collection.find_one({"id": document_id}, {"_id": 0})
    else:
        doc = documents_db.get(document_id)
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Template definitions (in production, these would be stored in DB)
    templates = {
        "invoice": {
            "name": "Standard Invoice",
            "required_fields": ["invoice_number", "invoice_date", "total_amount", "vendor_name"],
            "optional_fields": ["line_items", "payment_terms", "due_date"]
        },
        "receipt": {
            "name": "Purchase Receipt",
            "required_fields": ["merchant_name", "receipt_date", "total_amount"],
            "optional_fields": ["items", "payment_method", "tax_amount"]
        },
        "contract": {
            "name": "Service Contract",
            "required_fields": ["contract_title", "parties", "effective_date"],
            "optional_fields": ["term_length", "total_value", "key_terms"]
        }
    }
    
    doc_type = doc.get("document_type")
    template = templates.get(doc_type, {})
    extracted = doc.get("extracted_fields", {})
    
    if not template:
        return {
            "document_id": document_id,
            "matched_template": None,
            "message": "No matching template found"
        }
    
    # Check field coverage
    required_found = [f for f in template.get("required_fields", []) if f in extracted]
    optional_found = [f for f in template.get("optional_fields", []) if f in extracted]
    
    coverage = len(required_found) / len(template.get("required_fields", [1])) * 100
    
    return {
        "document_id": document_id,
        "matched_template": template.get("name"),
        "coverage_percent": round(coverage, 1),
        "required_fields": {
            "expected": template.get("required_fields", []),
            "found": required_found,
            "missing": [f for f in template.get("required_fields", []) if f not in extracted]
        },
        "optional_fields": {
            "expected": template.get("optional_fields", []),
            "found": optional_found
        }
    }

# ==================== ANALYTICS ====================

@router.get("/analytics")
async def get_ocr_analytics():
    """Get OCR/AI processing analytics"""
    
    if documents_collection is not None:
        total_docs = await documents_collection.count_documents({})
        
        # By type
        pipeline = [{"$group": {"_id": "$document_type", "count": {"$sum": 1}}}]
        by_type = await documents_collection.aggregate(pipeline).to_list(10)
        
        # Average confidence
        conf_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$confidence_score"}}}]
        conf_result = await documents_collection.aggregate(conf_pipeline).to_list(1)
        avg_confidence = conf_result[0]["avg"] if conf_result else 0
        
        # Average processing time
        time_pipeline = [{"$group": {"_id": None, "avg": {"$avg": "$processing_time_ms"}}}]
        time_result = await documents_collection.aggregate(time_pipeline).to_list(1)
        avg_time = time_result[0]["avg"] if time_result else 0
        
        total_extractions = await extractions_collection.count_documents({})
    else:
        total_docs = len(documents_db)
        by_type = {}
        for d in documents_db.values():
            t = d["document_type"]
            by_type[t] = by_type.get(t, 0) + 1
        by_type = [{"_id": k, "count": v} for k, v in by_type.items()]
        
        avg_confidence = sum(d.get("confidence_score", 0) for d in documents_db.values()) / len(documents_db) if documents_db else 0
        avg_time = sum(d.get("processing_time_ms", 0) for d in documents_db.values()) / len(documents_db) if documents_db else 0
        total_extractions = len(extractions_db)
    
    return {
        "total_documents_scanned": total_docs,
        "total_smart_extractions": total_extractions,
        "documents_by_type": {item["_id"]: item["count"] for item in by_type},
        "average_confidence_score": round(avg_confidence, 2),
        "average_processing_time_ms": round(avg_time, 0)
    }

# ==================== SEED DATA ====================

@router.post("/seed-demo")
async def seed_demo_data():
    """Seed demo OCR data"""
    
    demo_documents = []
    
    for doc_type, data in MOCK_OCR_RESULTS.items():
        doc_id = f"doc_demo_{doc_type}"
        demo_documents.append({
            "id": doc_id,
            "document_type": doc_type,
            "extracted_fields": data,
            "confidence_score": 0.92,
            "raw_text": f"[Demo OCR text for {doc_type}]",
            "processing_time_ms": 175,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "processed"
        })
    
    if documents_collection is not None:
        await documents_collection.delete_many({})
        for doc in demo_documents:
            await documents_collection.insert_one(doc)
    else:
        documents_db.clear()
        for doc in demo_documents:
            documents_db[doc["id"]] = doc
    
    return {
        "message": "Demo data seeded",
        "documents": len(demo_documents)
    }
