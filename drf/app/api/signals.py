from django.contrib.auth.models import Group, Permission


def ensure_default_groups(sender, **kwargs):
    # Rename legacy HS/LS back to supervisor/pegawai when present
    legacy_to_new = {
        "HS": "supervisor",
        "LS": "pegawai",
        "localstaff": "pegawai",
    }
    for old, new in legacy_to_new.items():
        try:
            g = Group.objects.get(name=old)
            Group.objects.get_or_create(name=new)
            if g.name != new and not Group.objects.filter(name=new).exclude(id=g.id).exists():
                g.name = new
                g.save(update_fields=["name"])
        except Group.DoesNotExist:
            pass

    # Ensure default groups
    for name in ["admin", "supervisor", "pegawai"]:
        Group.objects.get_or_create(name=name)


