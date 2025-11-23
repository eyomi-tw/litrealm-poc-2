Recommendations for Outline Version Management
Option 1: Status-Based System (Recommended for MVP)
Best for: Writers who want simplicity and clear workflow

Add a status field to outlines with these states:
- Draft - Work in progress, can be edited freely
- Active - Currently being used for chapter generation (only ONE active outline per project)
•	Archived - Previous versions kept for reference
Benefits:
•	Simple and intuitive
•	One clear "active" outline that chapters link to
•	Old versions preserved but clearly marked as inactive
•	Easy to switch which outline is active
UI Changes:
•	Status badge on each outline card (Draft/Active/Archived)
•	"Set as Active" button on draft outlines
•	Warning when switching active outline: "X chapters are linked to the current active outline. Switch anyway?"
•	Archived outlines shown in collapsed section or separate tab
Option 2: Parent-Child Version Tree
Best for: Writers who want to experiment with variations

Add parent_id field to track outline lineage:
interface Outline {
id: string;
parent_id: string | null;  // Links to previous version
version_number: number;     // Auto-incremented
is_active: boolean;         // Only one active per project
...
}
Benefits:
•	Clear version history (v1 → v2 → v3)
•	"Duplicate & Edit" creates new version linked to parent
•	Can compare versions side-by-side
•	Branching possible (v2a, v2b from v1)
UI Changes:
•	Version tree visualization
•	"Create New Version" button (duplicates current active)
•	Version comparison view
•	Timeline showing when each version was created
Option 3: Named Versions with Tagging
Best for: Writers exploring multiple story directions

Add name and tags:
interface Outline {
id: string;
title: string;
version_name: string;      // "Original", "Dark Ending", "Extended Cut"
tags: string[];            // ["preferred", "experimental", "publisher-notes"]
is_active: boolean;
...
}
Benefits:
•	Meaningful names instead of "v1", "v2", "v3"
•	Can mark preferred/experimental versions
•	Easy to organize by tags
•	Multiple exploration paths
Recommended Approach: Hybrid System
I recommend combining elements of Options 1 and 2:

Database Schema:
interface Outline {
id: string;
project_id: string;
title: string;
description: string | null;

// Versioning
version_name: string;        // User-friendly: "Draft 1", "Editor Feedback", etc.
version_number: number;       // Auto: 1, 2, 3...
parent_outline_id: string | null;  // Tracks lineage

// Status
status: 'draft' | 'active' | 'archived';

// Metadata
structure: Array<...>;
notes: string | null;
created_at: string;
updated_at: string;
}
Key Features:
1.	Active Outline Enforcement
      o	Only ONE active outline per project
      o	Chapters always link to the active outline
      o	Switching active requires confirmation if chapters exist
2.	Easy Version Creation
      o	"Duplicate This Outline" button
      o	Auto-increments version number
      o	User can name it meaningfully
      o	New version starts as Draft
3.	Clear Visual Hierarchy
4.	Outlines
5.	├─ Active: "Main Story Arc v3" (badge: ACTIVE)
6.	├─ Drafts
7.	│  └─ "Alternate Ending Experiment" (can set as active)
8.	└─ Archived
9.	   ├─ "Main Story Arc v2" (view only, can restore)
10.	   └─ "Original Draft v1" (view only, can restore)
11.	Version Operations
       o	Set as Active: Changes status to active, demotes current active to draft
       o	Archive: Moves to archived section
       o	Restore: Moves archived back to draft
       o	Compare: Side-by-side comparison with another version
       o	Duplicate: Creates new child version
12.	Safety Features
       o	Can't delete active outline
       o	Can't delete outline with linked chapters (must archive instead)
       o	Warning before switching active if chapters exist
       o	"Restore from Archive" for recovery
       UI Mockup Structure
       ┌─ Outlines Tab ────────────────────────────────┐
       │                                                │
       │ [+ Create New] [Generate with AI]             │
       │                                                │
       │ ▼ Active Outline                               │
       │ ┌────────────────────────────────────────────┐│
       │ │ 🟢 Main Story Arc v3         [ACTIVE]      ││
       │ │ Created: 2 days ago • 15 chapters linked   ││
       │ │ [View] [Edit] [Archive] [Duplicate]        ││
       │ └────────────────────────────────────────────┘│
       │                                                │
       │ ▼ Draft Outlines (2)                          │
       │ ┌────────────────────────────────────────────┐│
       │ │ 📝 Alternate Ending Test v4                ││
       │ │ Created: 1 hour ago                        ││
       │ │ [View] [Edit] [Set as Active] [Archive]   ││
       │ └────────────────────────────────────────────┘│
       │ ┌────────────────────────────────────────────┐│
       │ │ 📝 Extended Prologue v2                    ││
       │ │ [View] [Edit] [Set as Active] [Archive]   ││
       │ └────────────────────────────────────────────┘│
       │                                                │
       │ ▶ Archived Outlines (3) [Show/Hide]          │
       └────────────────────────────────────────────────┘
       Would you like me to implement this hybrid versioning system? It provides the right balance of:
       •	Simplicity: Clear active/draft/archived states
       •	Flexibility: Can experiment with multiple versions
       •	Safety: Can't accidentally lose work
       •	Clarity: Always know which outline drives chapter generation

