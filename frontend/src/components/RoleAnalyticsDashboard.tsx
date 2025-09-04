"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RoleAnalytics, TemplateStats } from "@/lib/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function RoleAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<RoleAnalytics | null>(null);
  const [templateStats, setTemplateStats] = useState<TemplateStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch role analytics
      const roleResponse = await fetch('/api/admin/roles/analytics/usage');
      if (roleResponse.ok) {
        const roleData = await roleResponse.json();
        setAnalytics(roleData);
      }

      // Fetch template stats
      const templateResponse = await fetch('/api/admin/roles/analytics/templates');
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        setTemplateStats(templateData);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const roleCategoryData = analytics ? Object.entries(analytics.roles_by_category).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value
  })) : [];

  const templateUsageData = analytics ? analytics.template_usage.map(item => ({
    name: item.template_name.length > 15 ? item.template_name.substring(0, 15) + '...' : item.template_name,
    usage: item.usage_count,
    percentage: item.percentage
  })) : [];

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.total_roles}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.active_roles} active, {analytics.total_roles - analytics.active_roles} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.system_roles}</div>
              <p className="text-xs text-muted-foreground">
                {((analytics.system_roles / analytics.total_roles) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Hierarchy Depth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.hierarchy_depth}</div>
              <p className="text-xs text-muted-foreground">
                Maximum inheritance levels
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Avg Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.average_permissions_per_role.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Per role on average
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Role Categories Pie Chart */}
        {roleCategoryData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Role Distribution by Category</CardTitle>
              <CardDescription>Breakdown of roles by category type</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={roleCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent ? (percent * 100).toFixed(0) : 0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {roleCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Template Usage Bar Chart */}
        {templateUsageData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Template Usage</CardTitle>
              <CardDescription>Most used role templates</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={templateUsageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'usage' ? `${value} roles` : `${value}%`,
                      name === 'usage' ? 'Usage Count' : 'Percentage'
                    ]}
                  />
                  <Bar dataKey="usage" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Template Statistics */}
      {templateStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateStats.total_templates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">System Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateStats.system_templates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateStats.active_templates}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templateStats.total_usage}</div>
              <p className="text-xs text-muted-foreground">
                Roles created from templates
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Most Used Template */}
      {templateStats?.most_used_template && (
        <Card>
          <CardHeader>
            <CardTitle>Most Used Template</CardTitle>
            <CardDescription>Template with highest usage count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{templateStats.most_used_template.name}</div>
                <div className="text-sm text-muted-foreground">
                  Used to create {templateStats.most_used_template.usage_count} roles
                </div>
              </div>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                🏆 Top Template
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Category Breakdown */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Category Breakdown</CardTitle>
            <CardDescription>Role count by category with percentages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.roles_by_category).map(([category, count]) => {
                const percentage = ((count / analytics.total_roles) * 100);
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="capitalize">
                        {category}
                      </Badge>
                      <span className="text-sm font-medium">{count} roles</span>
                    </div>
                    <div className="flex items-center gap-3 min-w-[120px]">
                      <Progress value={percentage} className="flex-1" />
                      <span className="text-sm text-muted-foreground w-12">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
