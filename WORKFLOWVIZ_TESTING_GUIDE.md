# WorkflowViz Testing Guide

A quick guide to verify all WorkflowViz features are working correctly.

---

## 🚀 Getting Started

1. Open the application and click the **"WorkflowViz"** tab in the navigation bar
2. You should see a list of workflows on the left panel and templates on the right

---

## ✅ Test Checklist

### 1. Select a Workflow
- [ ] Click on **"Client Onboarding Process"** in the workflow list
- [ ] Canvas should load with nodes (colored cards) and connecting lines
- [ ] You should see a **Layer Guide bubble** appear in the bottom-left corner

### 2. Layer Guide Bubble
- [ ] Guide shows **"🏔️ Strategic Layer"** title
- [ ] Click **"Next"** to see step 2 ("Look for ACTION Nodes")
- [ ] Click **"Next"** again for step 3 ("Double-click to Drill Down")
- [ ] Click **"Got it!"** - guide should minimize to a small icon
- [ ] Click the icon to expand the guide again
- [ ] Click **"X"** to dismiss (won't show again until localStorage is cleared)

### 3. Node Interactions
- [ ] **Click** on any node - a details panel should appear on the right
- [ ] Panel shows: node name, type badge, description, connection stats
- [ ] Click **"X"** on the panel to close it

### 4. 3-Layer Hierarchy Navigation
- [ ] Find a **blue ACTION node** (has "Double-click to drill down" text)
- [ ] **Double-click** the ACTION node
- [ ] Breadcrumb should update: `Strategic > [Node Name]`
- [ ] Layer badge should change to **"⚔️ TACTICAL"** (amber color)
- [ ] Guide bubble should update with Tactical layer content
- [ ] Click **"Strategic"** in breadcrumb to go back to top level

### 5. Canvas Controls (Top-Right Toolbar)
- [ ] **Undo/Redo** buttons - make a change, then undo it
- [ ] **Auto-Layout** (grid icon) - click to reorganize nodes neatly
- [ ] **Export PNG** - click to download workflow as image
- [ ] **Zoom controls** - use +/- buttons or scroll wheel
- [ ] **Fit View** - centers and fits all nodes on screen

### 6. Add New Node
- [ ] Click **"+ Add Node"** button
- [ ] Select a node type (Issue, Action, Resource, Deliverable, Note)
- [ ] Fill in the name and description
- [ ] Click **"Add Node"** - new node should appear on canvas

### 7. Create Connections
- [ ] Drag from a node's **output handle** (right side, small circle)
- [ ] Drop on another node's **input handle** (left side)
- [ ] A connecting line should appear between the nodes

### 8. Delete Node
- [ ] Select a node by clicking it
- [ ] In the details panel, click the **"Delete"** button (trash icon)
- [ ] Node should be removed from canvas

### 9. Save Workflow
- [ ] Make some changes to the canvas
- [ ] Status indicator should show **"Saving..."** then **"Saved"**
- [ ] Refresh the page - your changes should persist

### 10. AI Generation (Optional - requires API key)
- [ ] Click **"Generate with AI"** button
- [ ] Enter a description like "Create a sales pipeline workflow"
- [ ] Click **"Generate"** - new workflow should be created

### 11. Save as Template
- [ ] Hold **Shift** and click multiple nodes to select them
- [ ] Click **"Save as Template"** button in toolbar
- [ ] Enter a template name and category
- [ ] Template should appear in the right panel

---

## 🎨 Visual Checklist

| Element | Expected Appearance |
|---------|---------------------|
| Issue nodes | Red accent, warning icon |
| Action nodes | Blue accent, lightning icon |
| Resource nodes | Green accent, folder icon |
| Deliverable nodes | Purple accent, package icon |
| Note nodes | Yellow/amber accent, lightbulb icon |
| Strategic layer | Blue badge with 🏔️ |
| Tactical layer | Amber badge with ⚔️ |
| Execution layer | Green badge with 🎯 |

---

## 🐛 Common Issues

| Problem | Solution |
|---------|----------|
| Canvas is blank | Select a workflow from the left panel |
| Nodes overlapping | Click the Auto-Layout button (grid icon) |
| Can't drill down | Only blue ACTION nodes support drill-down |
| Guide not showing | Clear localStorage and refresh |
| Changes not saving | Check browser console for errors |

---

## 📝 Quick Test Script

```
1. Click WorkflowViz tab
2. Select "Client Onboarding Process"
3. Verify nodes appear
4. Click through Layer Guide (Next → Next → Got it!)
5. Double-click a blue ACTION node
6. Verify breadcrumb shows "Strategic > [Name]"
7. Click "Strategic" to go back
8. Click Auto-Layout button
9. Add a new node
10. Delete the node
11. ✅ All features working!
```

---

**Last Updated:** January 2025
