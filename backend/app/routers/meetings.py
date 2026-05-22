from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    AuditLog,
    Meeting,
    MeetingParticipant,
    ROLE_LEVEL,
    Role,
    User,
    role_can_see_all,
)
from app.schemas import MeetingCreate, MeetingOut, MeetingUpdate

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


def _can_organize(role: Role) -> bool:
    return ROLE_LEVEL.get(role, 0) >= 30  # manager+


def _serialize(m: Meeting) -> dict:
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_at": m.starts_at,
        "ends_at": m.ends_at,
        "location": m.location,
        "organizer_id": m.organizer_id,
        "department": m.department,
        "status": m.status,
        "created_at": m.created_at,
        "participants": [
            {"id": p.id, "user_id": p.user_id, "response": p.response}
            for p in m.participants if True
        ] if hasattr(m, "participants") else [],
    }


@router.get("", response_model=list[MeetingOut])
def list_meetings(
    upcoming_only: bool = Query(False),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = db.query(Meeting).order_by(Meeting.starts_at.desc())
    if upcoming_only:
        q = q.filter(Meeting.starts_at >= datetime.utcnow())
    if not role_can_see_all(user.role):
        participating = (
            db.query(MeetingParticipant.meeting_id)
            .filter(MeetingParticipant.user_id == user.id)
            .subquery()
        )
        filters = [Meeting.organizer_id == user.id, Meeting.id.in_(participating)]
        if user.department:
            filters.append(Meeting.department == user.department)
        q = q.filter(or_(*filters))

    meetings = q.all()
    result = []
    for m in meetings:
        parts = (
            db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == m.id).all()
        )
        result.append(
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "starts_at": m.starts_at,
                "ends_at": m.ends_at,
                "location": m.location,
                "organizer_id": m.organizer_id,
                "department": m.department,
                "status": m.status,
                "created_at": m.created_at,
                "participants": [
                    {"id": p.id, "user_id": p.user_id, "response": p.response} for p in parts
                ],
            }
        )
    return result


@router.post("", response_model=MeetingOut, status_code=201)
def create_meeting(
    payload: MeetingCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not _can_organize(user.role):
        raise HTTPException(status_code=403, detail="Только менеджеры и выше могут создавать встречи")

    m = Meeting(
        title=payload.title,
        description=payload.description,
        starts_at=payload.starts_at,
        ends_at=payload.ends_at,
        location=payload.location,
        organizer_id=user.id,
        department=payload.department or user.department,
        status="scheduled",
    )
    db.add(m)
    db.flush()

    for uid in payload.participant_ids:
        if db.query(User).filter(User.id == uid).first():
            db.add(MeetingParticipant(meeting_id=m.id, user_id=uid))

    db.add(AuditLog(user_id=user.id, action="create_meeting", resource=payload.title))
    db.commit()
    db.refresh(m)

    parts = db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == m.id).all()
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_at": m.starts_at,
        "ends_at": m.ends_at,
        "location": m.location,
        "organizer_id": m.organizer_id,
        "department": m.department,
        "status": m.status,
        "created_at": m.created_at,
        "participants": [
            {"id": p.id, "user_id": p.user_id, "response": p.response} for p in parts
        ],
    }


@router.patch("/{meeting_id}", response_model=MeetingOut)
def update_meeting(
    meeting_id: int,
    payload: MeetingUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if m.organizer_id != user.id and not role_can_see_all(user.role):
        raise HTTPException(status_code=403, detail="Только организатор может редактировать встречу")

    if payload.title is not None:
        m.title = payload.title
    if payload.description is not None:
        m.description = payload.description
    if payload.starts_at is not None:
        m.starts_at = payload.starts_at
    if payload.ends_at is not None:
        m.ends_at = payload.ends_at
    if payload.location is not None:
        m.location = payload.location
    if payload.status is not None:
        m.status = payload.status

    db.add(AuditLog(user_id=user.id, action="update_meeting", resource=m.title))
    db.commit()
    db.refresh(m)
    parts = db.query(MeetingParticipant).filter(MeetingParticipant.meeting_id == m.id).all()
    return {
        "id": m.id,
        "title": m.title,
        "description": m.description,
        "starts_at": m.starts_at,
        "ends_at": m.ends_at,
        "location": m.location,
        "organizer_id": m.organizer_id,
        "department": m.department,
        "status": m.status,
        "created_at": m.created_at,
        "participants": [
            {"id": p.id, "user_id": p.user_id, "response": p.response} for p in parts
        ],
    }


@router.post("/{meeting_id}/respond")
def respond(
    meeting_id: int,
    response: str = Query(..., pattern="^(accepted|declined|pending)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    part = (
        db.query(MeetingParticipant)
        .filter(
            MeetingParticipant.meeting_id == meeting_id,
            MeetingParticipant.user_id == user.id,
        )
        .first()
    )
    if not part:
        raise HTTPException(status_code=404, detail="Вы не участник этой встречи")
    part.response = response
    db.commit()
    return {"response": response}


@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    m = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Not found")
    if m.organizer_id != user.id and not role_can_see_all(user.role):
        raise HTTPException(status_code=403, detail="Только организатор может удалить встречу")
    db.delete(m)
    db.add(AuditLog(user_id=user.id, action="delete_meeting", resource=m.title))
    db.commit()
