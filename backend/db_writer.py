import logging
from datetime import datetime
from typing import List

from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Integer, String, Text, create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import declarative_base, sessionmaker

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

Base = declarative_base()


class EventAlert(BaseModel):
    """Pydantic model representing an event alert.

    This model defines the structure of event alerts to be logged in the database.

    Attributes:
        event_timestamp: Timestamp when the event occurred
        event_code: Code identifying the type of event
        event_description: Short description of the event
        event_detection_explanation_by_ai: Detailed AI-generated explanation of the event
        event_video_url: URL to the video associated with the event
    """

    event_timestamp: datetime
    event_code: str
    event_description: str
    event_detection_explanation_by_ai: str
    event_video_url: str


class EventLog(Base):
    """SQLAlchemy model representing event log entries in the database.

    Attributes:
        event_id: Primary key, auto-incremented ID for each event
        event_timestamp: Timestamp when the event occurred
        event_code: Code identifying the type of event
        event_description: Short description of the event
        event_video_url: URL to the video associated with the event
        event_detection_explanation_by_ai: Detailed AI-generated explanation of the event
    """

    __tablename__ = "event_logs"

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    event_timestamp = Column(DateTime(timezone=True), nullable=False)
    event_code = Column(String(20), nullable=False)
    event_description = Column(Text, nullable=False)
    event_video_url = Column(String(255), nullable=False)
    event_detection_explanation_by_ai = Column(Text, nullable=False)


class DBWriter:
    """Database writer for event logs.

    This class handles creating and writing event logs to a SQL database.

    Attributes:
        db_url: Database connection URL
        engine: SQLAlchemy engine instance
        Session: SQLAlchemy session factory
    """

    def __init__(self, db_url: str, create_tables: bool = False) -> None:
        """Initialize the database writer.

        Args:
            db_url: Database connection URL
            create_tables: If True, creates tables in the database
        """
        self.db_url = db_url
        try:
            self.engine = create_engine(self.db_url, pool_pre_ping=True)
            self.Session = sessionmaker(bind=self.engine)
            if create_tables:
                self.setup_database()
        except SQLAlchemyError as e:
            logger.error(f"Failed to initialize database engine or session: {e}")
            raise

    def setup_database(self, reset: bool = False) -> None:
        """Set up the database schema.

        Creates all tables defined in the Base metadata if they don't exist.

        Args:
            reset: If True, drops all existing tables before creating new ones

        Raises:
            SQLAlchemyError: If there's an error during table creation
        """
        try:
            if reset:
                logger.warning("Dropping all existing tables from database.")
                Base.metadata.drop_all(self.engine)

            logger.info("Creating database tables if they don't exist.")
            Base.metadata.create_all(self.engine)
            logger.info("Database tables created or verified.")
        except SQLAlchemyError as e:
            logger.error(f"Database setup failed: {e}")
            raise

    def write_events(
        self,
        events: List[EventAlert],
    ) -> int:
        """Write multiple events to the database.

        Args:
            events: List of EventAlert objects to write to the database

        Returns:
            int: Number of events successfully written to the database

        Raises:
            SQLAlchemyError: If there's an error during database write operations
        """
        written_count = 0
        try:
            with self.Session() as session:
                try:
                    for event in events:
                        event_log = EventLog(
                            event_timestamp=event.event_timestamp,
                            event_code=event.event_code,
                            event_description=event.event_description,
                            event_video_url=event.event_video_url,
                            event_detection_explanation_by_ai=event.event_detection_explanation_by_ai,
                        )
                        session.add(event_log)
                    session.commit()
                    written_count = len(events)
                except SQLAlchemyError as e:
                    logger.error(f"Error during database commit: {e}")
                    session.rollback()
                    raise
        except SQLAlchemyError as e:
            logger.error(f"Failed to create database session: {e}")
            raise
        except Exception as e:
            logger.error(f"An unexpected error occurred during event writing: {e}")
            raise

        return written_count
