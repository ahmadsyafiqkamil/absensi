from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from zoneinfo import ZoneInfo

from django.utils import timezone as dj_timezone

from .models import WorkSettings, Holiday


@dataclass
class LatenessResult:
    is_workday: bool
    is_holiday: bool
    is_late: bool
    minutes_late: int
    earliest_checkout_local_iso: Optional[str]
    settings_timezone: str


def _get_settings() -> WorkSettings:
    obj, _ = WorkSettings.objects.get_or_create()
    return obj


def evaluate_lateness(check_in: datetime) -> LatenessResult:
    """
    Evaluate lateness for a single check-in datetime using global WorkSettings.

    Rules (Option B preferred):
    - If not a workday or it's a holiday: not late.
    - Base start at settings.start_time (local date/time in settings.timezone).
    - If check-in <= base start + grace: on time.
    - If check-in > base start + grace: late, minutes above grace threshold.
    - Earliest checkout is always check-in + required_minutes (flex 8 hours).

    Input `check_in` can be naive or aware; naive is assumed to be in UTC.
    Output `earliest_checkout_local_iso` is in settings.timezone ISO format.
    """
    settings = _get_settings()
    tzname = settings.timezone or dj_timezone.get_current_timezone_name()
    tz = ZoneInfo(tzname)

    # Normalize incoming datetime to aware UTC then to local
    if check_in.tzinfo is None:
        check_in_utc = check_in.replace(tzinfo=ZoneInfo("UTC"))
    else:
        check_in_utc = check_in.astimezone(ZoneInfo("UTC"))
    check_in_local = check_in_utc.astimezone(tz)

    local_date = check_in_local.date()
    weekday = check_in_local.weekday()  # Monday=0..Sunday=6

    workdays = settings.workdays or []
    is_workday = weekday in workdays
    is_holiday = Holiday.objects.filter(date=local_date).exists()

    if not is_workday or is_holiday:
        return LatenessResult(
            is_workday=is_workday,
            is_holiday=is_holiday,
            is_late=False,
            minutes_late=0,
            earliest_checkout_local_iso=None,
            settings_timezone=tzname,
        )

    base_start_local = datetime.combine(local_date, settings.start_time, tz)
    grace = timedelta(minutes=int(settings.grace_minutes or 0))

    # Determine lateness
    is_late = check_in_local > (base_start_local + grace)
    late_delta = check_in_local - base_start_local - grace
    minutes_late = int(max(0, round(late_delta.total_seconds() / 60))) if is_late else 0

    # Earliest checkout is always 8 hours (required_minutes) after check-in (flex)
    required = timedelta(minutes=int(settings.required_minutes or 0))
    earliest_checkout_local = check_in_local + required

    return LatenessResult(
        is_workday=True,
        is_holiday=False,
        is_late=is_late,
        minutes_late=minutes_late,
        earliest_checkout_local_iso=earliest_checkout_local.isoformat(),
        settings_timezone=tzname,
    )


def evaluate_lateness_as_dict(check_in: datetime) -> Dict[str, Any]:
    r = evaluate_lateness(check_in)
    return {
        "is_workday": r.is_workday,
        "is_holiday": r.is_holiday,
        "is_late": r.is_late,
        "minutes_late": r.minutes_late,
        "earliest_checkout_local_iso": r.earliest_checkout_local_iso,
        "timezone": r.settings_timezone,
    }


