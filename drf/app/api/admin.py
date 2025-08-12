from django.contrib import admin
from .models import Division, Position, Employee

@admin.register(Division)
class DivisionAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ("id", "name")
    search_fields = ("name",)


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ("id", "nip", "user", "division", "position")
    search_fields = ("nip", "user__username", "user__email")
    list_filter = ("division", "position")
