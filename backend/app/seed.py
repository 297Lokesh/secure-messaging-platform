import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation, ConversationMember
from app.models.message import Message, MessageRead
from app.models.settings import UserSettings
from app.auth.security import get_password_hash

logger = logging.getLogger("seed")
logging.basicConfig(level=logging.INFO)

DEMO_PASSWORD = "DemoPass123!"


def seed_database():
    """Seed the SQLite database with rich demo users, contacts, conversations, and messages."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # Check if already seeded
        if db.query(User).count() >= 6:
            logger.info("Database is already seeded.")
            return

        logger.info("Seeding database with demo data...")
        pw_hash = get_password_hash(DEMO_PASSWORD)
        base_time = datetime.utcnow() - timedelta(days=2)

        # 1. Create Users
        users_data = [
            {
                "username": "demo",
                "phone": "+1234567001",
                "display_name": "Demo User",
                "avatar_url": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "sarah",
                "phone": "+1234567002",
                "display_name": "Sarah Jenkins",
                "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "alex",
                "phone": "+1234567003",
                "display_name": "Alex Chen",
                "avatar_url": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            },
            {
                "username": "priya",
                "phone": "+1234567004",
                "display_name": "Priya Sharma",
                "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
                "is_online": True,
            },
            {
                "username": "john",
                "phone": "+1234567005",
                "display_name": "John Doe",
                "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            },
            {
                "username": "david",
                "phone": "+1234567006",
                "display_name": "David Miller",
                "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
                "is_online": False,
            },
        ]

        created_users = {}
        for idx, u_info in enumerate(users_data):
            user = User(
                username=u_info["username"],
                phone=u_info["phone"],
                password_hash=pw_hash,
                display_name=u_info["display_name"],
                avatar_url=u_info["avatar_url"],
                is_online=u_info["is_online"],
                last_seen=base_time + timedelta(hours=idx * 4),
                created_at=base_time,
            )
            db.add(user)
            db.flush()
            created_users[u_info["username"]] = user

            # Add default settings
            settings = UserSettings(user_id=user.id, theme="light")
            db.add(settings)

        demo_user = created_users["demo"]
        sarah_user = created_users["sarah"]
        alex_user = created_users["alex"]
        priya_user = created_users["priya"]
        john_user = created_users["john"]
        david_user = created_users["david"]

        # 2. Add Contacts
        contacts_to_add = [
            (demo_user.id, sarah_user.id),
            (demo_user.id, alex_user.id),
            (demo_user.id, priya_user.id),
            (demo_user.id, john_user.id),
            (demo_user.id, david_user.id),
            (sarah_user.id, demo_user.id),
            (alex_user.id, demo_user.id),
            (priya_user.id, demo_user.id),
        ]
        for uid, cid in contacts_to_add:
            db.add(Contact(user_id=uid, contact_user_id=cid, created_at=base_time))

        # 3. Create Direct Conversation 1: Demo User <-> Sarah Jenkins
        conv_sarah = Conversation(
            type="direct",
            created_by=demo_user.id,
            created_at=base_time + timedelta(hours=1),
            updated_at=datetime.utcnow() - timedelta(minutes=5),
        )
        db.add(conv_sarah)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_sarah.id, user_id=demo_user.id, role="member"),
            ConversationMember(conversation_id=conv_sarah.id, user_id=sarah_user.id, role="member"),
        ])

        # Messages in Sarah conversation
        t1 = base_time + timedelta(hours=1, minutes=10)
        m1 = Message(
            conversation_id=conv_sarah.id,
            sender_id=demo_user.id,
            content="Hey Sarah! How is the Signal secure messaging architecture coming along?",
            message_type="text",
            status="read",
            created_at=t1,
            updated_at=t1,
        )
        db.add(m1)
        db.flush()
        db.add(MessageRead(message_id=m1.id, user_id=sarah_user.id, read_at=t1 + timedelta(minutes=2)))

        t2 = t1 + timedelta(minutes=5)
        m2 = Message(
            conversation_id=conv_sarah.id,
            sender_id=sarah_user.id,
            content="Hey! It's looking really clean. We have SQLite with indexed queries, WebSockets with connection tracking, and JWT auth.",
            message_type="text",
            status="read",
            created_at=t2,
            updated_at=t2,
        )
        db.add(m2)
        db.flush()
        db.add(MessageRead(message_id=m2.id, user_id=demo_user.id, read_at=t2 + timedelta(minutes=1)))

        t3 = datetime.utcnow() - timedelta(minutes=15)
        m3 = Message(
            conversation_id=conv_sarah.id,
            sender_id=demo_user.id,
            content="Awesome! I'll test the delivery and read receipt ticks now.",
            message_type="text",
            status="read",
            created_at=t3,
            updated_at=t3,
        )
        db.add(m3)
        db.flush()
        db.add(MessageRead(message_id=m3.id, user_id=sarah_user.id, read_at=t3 + timedelta(minutes=2)))

        t4 = datetime.utcnow() - timedelta(minutes=5)
        m4 = Message(
            conversation_id=conv_sarah.id,
            sender_id=sarah_user.id,
            content="Sounds great! I just verified the simulated encryption badges as well. Everything is working seamlessly.",
            message_type="text",
            status="delivered",
            created_at=t4,
            updated_at=t4,
        )
        db.add(m4)

        # 4. Create Direct Conversation 2: Demo User <-> Alex Chen (with Unread message)
        conv_alex = Conversation(
            type="direct",
            created_by=alex_user.id,
            created_at=base_time + timedelta(hours=5),
            updated_at=datetime.utcnow() - timedelta(minutes=30),
        )
        db.add(conv_alex)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_alex.id, user_id=demo_user.id, role="member"),
            ConversationMember(conversation_id=conv_alex.id, user_id=alex_user.id, role="member"),
        ])

        m_alex1 = Message(
            conversation_id=conv_alex.id,
            sender_id=demo_user.id,
            content="Hi Alex, how is the Tailwind design token matching Signal desktop?",
            message_type="text",
            status="read",
            created_at=datetime.utcnow() - timedelta(hours=2),
            updated_at=datetime.utcnow() - timedelta(hours=2),
        )
        db.add(m_alex1)
        db.flush()
        db.add(MessageRead(message_id=m_alex1.id, user_id=alex_user.id, read_at=datetime.utcnow() - timedelta(hours=1, minutes=50)))

        m_alex2 = Message(
            conversation_id=conv_alex.id,
            sender_id=alex_user.id,
            content="The Signal blue (#2c6bed) and dark slate themes match the desktop client perfectly. Have you tested the mobile drawer navigation?",
            message_type="text",
            status="delivered",
            created_at=datetime.utcnow() - timedelta(minutes=30),
            updated_at=datetime.utcnow() - timedelta(minutes=30),
        )
        # Note: m_alex2 is intentionally UNREAD by demo_user so that an unread badge appears!
        db.add(m_alex2)

        # 5. Create Direct Conversation 3: Demo User <-> Priya Sharma
        conv_priya = Conversation(
            type="direct",
            created_by=priya_user.id,
            created_at=base_time + timedelta(hours=8),
            updated_at=datetime.utcnow() - timedelta(hours=3),
        )
        db.add(conv_priya)
        db.flush()
        db.add_all([
            ConversationMember(conversation_id=conv_priya.id, user_id=demo_user.id, role="member"),
            ConversationMember(conversation_id=conv_priya.id, user_id=priya_user.id, role="member"),
        ])

        m_priya1 = Message(
            conversation_id=conv_priya.id,
            sender_id=priya_user.id,
            content="Hey! The WebSocket debounced typing indicator is functioning smoothly.",
            message_type="text",
            status="read",
            created_at=datetime.utcnow() - timedelta(hours=4),
            updated_at=datetime.utcnow() - timedelta(hours=4),
        )
        db.add(m_priya1)
        db.flush()
        db.add(MessageRead(message_id=m_priya1.id, user_id=demo_user.id, read_at=datetime.utcnow() - timedelta(hours=3, minutes=50)))

        m_priya2 = Message(
            conversation_id=conv_priya.id,
            sender_id=demo_user.id,
            content="Thanks for confirming Priya! The 1000ms debounce prevents socket flooding nicely.",
            message_type="text",
            status="read",
            created_at=datetime.utcnow() - timedelta(hours=3),
            updated_at=datetime.utcnow() - timedelta(hours=3),
        )
        db.add(m_priya2)
        db.flush()
        db.add(MessageRead(message_id=m_priya2.id, user_id=priya_user.id, read_at=datetime.utcnow() - timedelta(hours=2, minutes=50)))

        # 6. Create Group Conversation: "Signal Core Engineering"
        conv_group = Conversation(
            type="group",
            name="Signal Core Engineering",
            avatar_url="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
            created_by=demo_user.id,
            created_at=base_time + timedelta(hours=2),
            updated_at=datetime.utcnow() - timedelta(minutes=1),
        )
        db.add(conv_group)
        db.flush()

        # Members: Demo User (admin), Sarah (member), Alex (member), Priya (member), David (member)
        group_members = [
            ConversationMember(conversation_id=conv_group.id, user_id=demo_user.id, role="admin"),
            ConversationMember(conversation_id=conv_group.id, user_id=sarah_user.id, role="member"),
            ConversationMember(conversation_id=conv_group.id, user_id=alex_user.id, role="member"),
            ConversationMember(conversation_id=conv_group.id, user_id=priya_user.id, role="member"),
            ConversationMember(conversation_id=conv_group.id, user_id=david_user.id, role="member"),
        ]
        db.add_all(group_members)

        # Messages in group
        gm1 = Message(
            conversation_id=conv_group.id,
            sender_id=demo_user.id,
            content="Welcome team! This group is for coordinating our secure messaging assignment and deployment.",
            message_type="text",
            status="read",
            created_at=datetime.utcnow() - timedelta(hours=1),
            updated_at=datetime.utcnow() - timedelta(hours=1),
        )
        db.add(gm1)

        gm2 = Message(
            conversation_id=conv_group.id,
            sender_id=sarah_user.id,
            content="Glad to be here! The normalized relational schema with cascading foreign keys is in place.",
            message_type="text",
            status="read",
            created_at=datetime.utcnow() - timedelta(minutes=45),
            updated_at=datetime.utcnow() - timedelta(minutes=45),
        )
        db.add(gm2)

        gm3 = Message(
            conversation_id=conv_group.id,
            sender_id=david_user.id,
            content="All SQLite indexes are verified. Query execution times are sub-millisecond.",
            message_type="text",
            status="delivered",
            created_at=datetime.utcnow() - timedelta(minutes=1),
            updated_at=datetime.utcnow() - timedelta(minutes=1),
        )
        db.add(gm3)

        db.commit()
        logger.info("Successfully seeded database with demo users, contacts, conversations, and messages.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
