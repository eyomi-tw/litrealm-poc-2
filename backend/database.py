"""
Database management for Books and Chapters
Uses SQLite for persistence, separate from ADK sessions database
"""

import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Optional
from models import Book, Chapter, GameMessage, GameConfig

DATABASE_PATH = "litrealms_books.db"

def init_database():
    """Initialize the books database with required tables"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Books table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            subtitle TEXT,
            game_config TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            total_word_count INTEGER DEFAULT 0
        )
    """)

    # Chapters table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS chapters (
            id TEXT PRIMARY KEY,
            book_id TEXT NOT NULL,
            number INTEGER NOT NULL,
            title TEXT NOT NULL,
            status TEXT NOT NULL,
            session_id TEXT NOT NULL,
            game_transcript TEXT NOT NULL,
            initial_state TEXT NOT NULL,
            final_state TEXT NOT NULL,
            authored_content TEXT NOT NULL,
            last_edited TEXT NOT NULL,
            word_count INTEGER DEFAULT 0,
            previous_chapter_id TEXT,
            next_chapter_id TEXT,
            narrative_summary TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (book_id) REFERENCES books(id),
            UNIQUE(book_id, number)
        )
    """)

    conn.commit()
    conn.close()
    print(f"Database initialized at {DATABASE_PATH}")

def create_book(user_id: str, title: str, game_config: GameConfig, subtitle: Optional[str] = None) -> Book:
    """Create a new book"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    book_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO books (id, user_id, title, subtitle, game_config, created_at, updated_at, total_word_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (book_id, user_id, title, subtitle, game_config.model_dump_json(), now, now, 0))

    conn.commit()
    conn.close()

    return Book(
        id=book_id,
        user_id=user_id,
        title=title,
        subtitle=subtitle,
        game_config=game_config,
        chapters=[],
        created_at=now,
        updated_at=now,
        total_word_count=0
    )

def get_book(book_id: str) -> Optional[Book]:
    """Get a book with all its chapters"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM books WHERE id = ?", (book_id,))
    book_row = cursor.fetchone()

    if not book_row:
        conn.close()
        return None

    # Get all chapters
    cursor.execute("SELECT * FROM chapters WHERE book_id = ? ORDER BY number", (book_id,))
    chapter_rows = cursor.fetchall()

    conn.close()

    chapters = [
        Chapter(
            id=row['id'],
            book_id=row['book_id'],
            number=row['number'],
            title=row['title'],
            status=row['status'],
            session_id=row['session_id'],
            game_transcript=json.loads(row['game_transcript']),
            initial_state=json.loads(row['initial_state']),
            final_state=json.loads(row['final_state']),
            authored_content=row['authored_content'],
            last_edited=row['last_edited'],
            word_count=row['word_count'],
            previous_chapter_id=row['previous_chapter_id'],
            next_chapter_id=row['next_chapter_id'],
            narrative_summary=row['narrative_summary'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )
        for row in chapter_rows
    ]

    game_config = GameConfig.model_validate_json(book_row['game_config'])

    return Book(
        id=book_row['id'],
        user_id=book_row['user_id'],
        title=book_row['title'],
        subtitle=book_row['subtitle'],
        game_config=game_config,
        chapters=chapters,
        created_at=book_row['created_at'],
        updated_at=book_row['updated_at'],
        total_word_count=book_row['total_word_count']
    )

def create_chapter(
    book_id: str,
    title: str,
    session_id: str,
    initial_state: dict,
    previous_chapter_id: Optional[str] = None
) -> Chapter:
    """Create a new chapter"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # Get the next chapter number
    cursor.execute("SELECT MAX(number) FROM chapters WHERE book_id = ?", (book_id,))
    result = cursor.fetchone()
    next_number = (result[0] or 0) + 1

    chapter_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()

    cursor.execute("""
        INSERT INTO chapters (
            id, book_id, number, title, status, session_id, game_transcript,
            initial_state, final_state, authored_content, last_edited, word_count,
            previous_chapter_id, next_chapter_id, narrative_summary, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        chapter_id, book_id, next_number, title, 'draft', session_id,
        json.dumps([]),  # Empty transcript
        json.dumps(initial_state),
        json.dumps(initial_state),  # Final state starts same as initial
        '',  # Empty authored content
        now, 0, previous_chapter_id, None, None, now, now
    ))

    # Update previous chapter's next_chapter_id
    if previous_chapter_id:
        cursor.execute(
            "UPDATE chapters SET next_chapter_id = ?, updated_at = ? WHERE id = ?",
            (chapter_id, now, previous_chapter_id)
        )

    conn.commit()
    conn.close()

    return Chapter(
        id=chapter_id,
        book_id=book_id,
        number=next_number,
        title=title,
        status='draft',
        session_id=session_id,
        game_transcript=[],
        initial_state=initial_state,
        final_state=initial_state,
        authored_content='',
        last_edited=now,
        word_count=0,
        previous_chapter_id=previous_chapter_id,
        next_chapter_id=None,
        narrative_summary=None,
        created_at=now,
        updated_at=now
    )

def get_chapter(chapter_id: str) -> Optional[Chapter]:
    """Get a single chapter"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM chapters WHERE id = ?", (chapter_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return Chapter(
        id=row['id'],
        book_id=row['book_id'],
        number=row['number'],
        title=row['title'],
        status=row['status'],
        session_id=row['session_id'],
        game_transcript=json.loads(row['game_transcript']),
        initial_state=json.loads(row['initial_state']),
        final_state=json.loads(row['final_state']),
        authored_content=row['authored_content'],
        last_edited=row['last_edited'],
        word_count=row['word_count'],
        previous_chapter_id=row['previous_chapter_id'],
        next_chapter_id=row['next_chapter_id'],
        narrative_summary=row['narrative_summary'],
        created_at=row['created_at'],
        updated_at=row['updated_at']
    )

def update_chapter(chapter_id: str, **updates) -> Optional[Chapter]:
    """Update a chapter with provided fields"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    now = datetime.utcnow().isoformat()
    updates['updated_at'] = now

    # Build dynamic UPDATE query
    set_clause = ', '.join(f"{key} = ?" for key in updates.keys())
    values = list(updates.values()) + [chapter_id]

    cursor.execute(f"UPDATE chapters SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()

    return get_chapter(chapter_id)

def update_chapter_transcript(chapter_id: str, transcript: list) -> None:
    """Update a chapter's game_transcript"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "UPDATE chapters SET game_transcript = ?, updated_at = ? WHERE id = ?",
        (json.dumps(transcript), now, chapter_id)
    )
    conn.commit()
    conn.close()

def update_chapter_state(chapter_id: str, state: dict) -> None:
    """Update a chapter's final_state"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()

    cursor.execute(
        "UPDATE chapters SET final_state = ?, updated_at = ? WHERE id = ?",
        (json.dumps(state), now, chapter_id)
    )
    conn.commit()
    conn.close()

def get_chapter_by_session_id(session_id: str) -> Optional[Chapter]:
    """Get a chapter by its session_id"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM chapters WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    return Chapter(
        id=row['id'],
        book_id=row['book_id'],
        number=row['number'],
        title=row['title'],
        status=row['status'],
        session_id=row['session_id'],
        game_transcript=json.loads(row['game_transcript']),
        initial_state=json.loads(row['initial_state']),
        final_state=json.loads(row['final_state']),
        authored_content=row['authored_content'],
        last_edited=row['last_edited'],
        word_count=row['word_count'],
        previous_chapter_id=row['previous_chapter_id'],
        next_chapter_id=row['next_chapter_id'],
        narrative_summary=row['narrative_summary'],
        created_at=row['created_at'],
        updated_at=row['updated_at']
    )

def list_books_by_user(user_id: str) -> List[Book]:
    """Get all books for a user"""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM books WHERE user_id = ? ORDER BY created_at DESC", (user_id,))
    book_ids = [row['id'] for row in cursor.fetchall()]
    conn.close()

    return [get_book(book_id) for book_id in book_ids if get_book(book_id)]

def update_book(book_id: str, title: Optional[str] = None, subtitle: Optional[str] = None, game_config: Optional[GameConfig] = None) -> Optional[Book]:
    """Update book metadata"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    now = datetime.utcnow().isoformat()
    updates = {'updated_at': now}

    if title is not None:
        updates['title'] = title
    if subtitle is not None:
        updates['subtitle'] = subtitle
    if game_config is not None:
        updates['game_config'] = game_config.model_dump_json()

    # Build dynamic UPDATE query
    set_clause = ', '.join(f"{key} = ?" for key in updates.keys())
    values = list(updates.values()) + [book_id]

    cursor.execute(f"UPDATE books SET {set_clause} WHERE id = ?", values)
    conn.commit()
    conn.close()

    return get_book(book_id)

def delete_book(book_id: str) -> bool:
    """Delete a book and all its chapters"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # First delete all chapters associated with the book
    cursor.execute("DELETE FROM chapters WHERE book_id = ?", (book_id,))

    # Then delete the book itself
    cursor.execute("DELETE FROM books WHERE id = ?", (book_id,))

    deleted_count = cursor.rowcount
    conn.commit()
    conn.close()

    return deleted_count > 0

def delete_chapter(chapter_id: str) -> bool:
    """
    Delete a chapter and update chapter links.
    When deleting a middle chapter, links the previous and next chapters together.
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()

    # First, get the chapter's previous and next links
    cursor.execute(
        "SELECT previous_chapter_id, next_chapter_id FROM chapters WHERE id = ?",
        (chapter_id,)
    )
    result = cursor.fetchone()

    if not result:
        conn.close()
        return False

    previous_chapter_id, next_chapter_id = result

    # Update the previous chapter's next_chapter_id to skip over the deleted chapter
    if previous_chapter_id:
        cursor.execute(
            "UPDATE chapters SET next_chapter_id = ? WHERE id = ?",
            (next_chapter_id, previous_chapter_id)
        )

    # Update the next chapter's previous_chapter_id to skip over the deleted chapter
    if next_chapter_id:
        cursor.execute(
            "UPDATE chapters SET previous_chapter_id = ? WHERE id = ?",
            (previous_chapter_id, next_chapter_id)
        )

    # Delete the chapter
    cursor.execute("DELETE FROM chapters WHERE id = ?", (chapter_id,))
    deleted_count = cursor.rowcount

    conn.commit()
    conn.close()

    return deleted_count > 0

# Initialize database on module import
init_database()
