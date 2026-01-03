"""
Quick script to reseed action templates
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from workflow_seed_data import get_predefined_action_templates

async def reseed_templates():
    # Connect to MongoDB
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['labyrinth_db']

    # Delete all existing action templates
    result = await db.wf_action_templates.delete_many({})
    print(f"Deleted {result.deleted_count} existing templates")

    # Insert all new templates
    templates = get_predefined_action_templates()
    print(f"Inserting {len(templates)} templates...")

    for template in templates:
        await db.wf_action_templates.insert_one(template.model_dump())

    print(f"Successfully seeded {len(templates)} action templates!")

    # List all templates
    all_templates = await db.wf_action_templates.find({}, {"action_name": 1, "category": 1, "_id": 0}).to_list(100)
    print("\nTemplates in database:")
    for t in all_templates:
        print(f"  - {t['action_name']} ({t['category']})")

    client.close()

if __name__ == "__main__":
    asyncio.run(reseed_templates())
