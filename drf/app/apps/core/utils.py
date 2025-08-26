import math
from datetime import datetime, time
from zoneinfo import ZoneInfo


def haversine_meters(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    Returns distance in meters
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in meters
    r = 6371000
    return c * r


def format_work_hours(minutes, use_indonesian=True):
    """Format work hours from minutes to human-readable format"""
    if not minutes or minutes <= 0:
        return '-'
    
    hours = int(minutes // 60)
    mins = round(minutes % 60)
    
    # Handle edge case where minutes rounds up to 60
    if mins == 60:
        hours += 1
        mins = 0
    
    # Format based on whether we have hours and/or minutes
    hour_symbol = 'j' if use_indonesian else 'h'
    
    if hours > 0 and mins > 0:
        return f"{hours}{hour_symbol} {mins}m"
    elif hours > 0:
        return f"{hours}{hour_symbol}"
    else:
        return f"{mins}m"


def evaluate_lateness_as_dict(check_in_time, start_time, grace_minutes=0):
    """
    Evaluate if check-in is late and return details
    Returns dict with: is_late, minutes_late, status
    """
    if not check_in_time or not start_time:
        return {
            'is_late': False,
            'minutes_late': 0,
            'status': 'unknown'
        }
    
    # Convert to time objects if they're datetime
    if isinstance(check_in_time, datetime):
        check_in_time = check_in_time.time()
    if isinstance(start_time, datetime):
        start_time = start_time.time()
    
    # Calculate minutes late
    start_minutes = start_time.hour * 60 + start_time.minute
    check_in_minutes = check_in_time.hour * 60 + check_in_time.minute
    
    minutes_late = check_in_minutes - start_minutes - grace_minutes
    
    if minutes_late <= 0:
        return {
            'is_late': False,
            'minutes_late': 0,
            'status': 'on_time'
        }
    else:
        return {
            'is_late': True,
            'minutes_late': minutes_late,
            'status': 'late'
        }


def get_local_datetime(utc_datetime, timezone_name):
    """Convert UTC datetime to local datetime in specified timezone"""
    if not utc_datetime:
        return None
    
    try:
        tz = ZoneInfo(timezone_name)
        return utc_datetime.astimezone(tz)
    except Exception:
        return utc_datetime


def is_workday(date, workdays):
    """Check if a date is a workday based on workdays list"""
    if not workdays:
        return True
    
    # Python: Monday=0, Sunday=6
    weekday = date.weekday()
    return weekday in workdays
