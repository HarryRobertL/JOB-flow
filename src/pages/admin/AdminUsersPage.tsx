/**
 * Admin User Management
 *
 * List users, create users, and edit role, display name, and coach–claimant assignments.
 */

import * as React from "react"
import { apiGet, apiPost, apiPatch, apiPut } from "@/lib/apiClient"
import { PageHeader, ErrorState } from "@/components/shared"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useToast } from "@/contexts/ToastContext"
import { Plus, Pencil, Loader2 } from "lucide-react"

interface AdminUser {
  id: string
  email: string
  role: "claimant" | "coach" | "admin"
  display_name: string | null
  assigned_claimant_ids: string[]
  cohort?: "pilot" | "control" | null
}

export const AdminUsersPage: React.FC = () => {
  const { showToast } = useToast()
  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<AdminUser | null>(null)
  const [isSaving, setIsSaving] = React.useState(false)
  const [formEmail, setFormEmail] = React.useState("")
  const [formPassword, setFormPassword] = React.useState("")
  const [formRole, setFormRole] = React.useState<"claimant" | "coach" | "admin">("claimant")
  const [formDisplayName, setFormDisplayName] = React.useState("")
  const [formAssignedIds, setFormAssignedIds] = React.useState<string[]>([])
  const [formCohort, setFormCohort] = React.useState<"pilot" | "control" | "">("")

  const fetchUsers = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await apiGet<{ users: AdminUser[] }>("/api/staff/admin/users")
      setUsers(res.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users")
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const claimantUsers = React.useMemo(
    () => users.filter((u) => u.role === "claimant"),
    [users]
  )

  const openAdd = () => {
    setEditingUser(null)
    setFormEmail("")
    setFormPassword("")
    setFormRole("claimant")
    setFormDisplayName("")
    setFormAssignedIds([])
    setFormCohort("")
    setModalOpen(true)
  }

  const openEdit = (user: AdminUser) => {
    setEditingUser(user)
    setFormEmail(user.email)
    setFormPassword("")
    setFormRole(user.role)
    setFormDisplayName(user.display_name || "")
    setFormAssignedIds(user.assigned_claimant_ids || [])
    setFormCohort(user.role === "claimant" && user.cohort ? user.cohort : "")
    setModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      if (editingUser) {
        await apiPatch<{ user: AdminUser }>(`/api/staff/admin/users/${editingUser.id}`, {
          role: formRole,
          display_name: formDisplayName.trim() || null,
          assigned_claimant_ids: formRole === "coach" ? formAssignedIds : undefined,
        })
        if (editingUser.role === "claimant" && formCohort) {
          await apiPut<Record<string, string>>("/api/staff/admin/claimant-cohorts", {
            claimant_id: editingUser.id,
            cohort: formCohort as "pilot" | "control",
          })
        }
        showToast({ title: "User updated", variant: "success" })
      } else {
        if (!formPassword.trim()) {
          showToast({ title: "Password is required for new users", variant: "error" })
          setIsSaving(false)
          return
        }
        const createRes = await apiPost<{ user: AdminUser }>("/api/staff/admin/users", {
          email: formEmail.trim(),
          password: formPassword,
          role: formRole,
          display_name: formDisplayName.trim() || undefined,
          assigned_claimant_ids: formRole === "coach" ? formAssignedIds : undefined,
        })
        if (formRole === "claimant" && formCohort && createRes?.user?.id) {
          await apiPut<Record<string, string>>("/api/staff/admin/claimant-cohorts", {
            claimant_id: createRes.user.id,
            cohort: formCohort as "pilot" | "control",
          })
        }
        showToast({ title: "User created", variant: "success" })
      }
      setModalOpen(false)
      fetchUsers()
    } catch (err) {
      showToast({
        title: editingUser ? "Update failed" : "Create failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "error",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAssigned = (claimantId: string) => {
    setFormAssignedIds((prev) =>
      prev.includes(claimantId) ? prev.filter((id) => id !== claimantId) : [...prev, claimantId]
    )
  }

  if (error && !users.length) {
    return (
      <div className="space-y-6">
        <PageHeader title="User management" />
        <ErrorState title="Unable to load users" message={error} onRetry={fetchUsers} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="User management"
          description="Create and manage users, assign roles, and link claimants to work coaches."
        />
        <Button onClick={openAdd} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add user
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {users.length} user{users.length !== 1 ? "s" : ""} in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-sm text-text-secondary py-8 text-center">
              No users yet. Add a user to get started.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Display name</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Assigned claimants</TableHead>
                  <TableHead className="w-[80px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="capitalize">{user.role}</TableCell>
                    <TableCell className="text-text-secondary">
                      {user.display_name || "—"}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {user.role === "claimant" ? (user.cohort || "—") : "—"}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {user.role === "coach"
                        ? (user.assigned_claimant_ids?.length ?? 0)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                        aria-label={`Edit ${user.email}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent onClose={() => setModalOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit user" : "Add user"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="admin-user-email">Email</Label>
              <Input
                id="admin-user-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                required
                disabled={!!editingUser}
                className="mt-1"
              />
              {editingUser && (
                <p className="text-xs text-text-tertiary mt-1">Email cannot be changed when editing.</p>
              )}
            </div>
            {!editingUser && (
              <div>
                <Label htmlFor="admin-user-password">Password</Label>
                <Input
                  id="admin-user-password"
                  type="password"
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  required={!editingUser}
                  className="mt-1"
                />
              </div>
            )}
            <div>
              <Label htmlFor="admin-user-role">Role</Label>
              <Select
                id="admin-user-role"
                value={formRole}
                onChange={(e) =>
                  setFormRole(e.target.value as "claimant" | "coach" | "admin")
                }
                className="mt-1"
              >
                <option value="claimant">Claimant</option>
                <option value="coach">Work coach</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="admin-user-display">Display name (optional)</Label>
              <Input
                id="admin-user-display"
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="mt-1"
              />
            </div>
            {formRole === "claimant" && (
              <div>
                <Label htmlFor="admin-user-cohort">Cohort (pilot/control)</Label>
                <select
                  id="admin-user-cohort"
                  value={formCohort}
                  onChange={(e) => setFormCohort(e.target.value as "pilot" | "control" | "")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1"
                >
                  <option value="">Not set</option>
                  <option value="pilot">Pilot</option>
                  <option value="control">Control</option>
                </select>
                <p className="text-xs text-text-tertiary mt-1">Used to filter claimants in DWP reports.</p>
              </div>
            )}
            {formRole === "coach" && claimantUsers.length > 0 && (
              <div>
                <Label>Assigned claimants</Label>
                <p className="text-xs text-text-secondary mt-1 mb-2">
                  Select claimants this work coach can see on their dashboard.
                </p>
                <div className="max-h-40 overflow-y-auto border border-border-default rounded-md p-2 space-y-2">
                  {claimantUsers.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={formAssignedIds.includes(c.id)}
                        onChange={() => toggleAssigned(c.id)}
                        className="rounded border-border-default"
                      />
                      <span className="text-text-primary">
                        {c.display_name || c.email}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : editingUser ? (
                  "Save changes"
                ) : (
                  "Create user"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
