import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Wallet, Lock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AppLayout from "@/components/layout/AppLayout";
import {
  authApiRequest,
  getStoredUser,
  readCachedAuthResponse,
  setAuthSession,
  writeCachedAuthResponse,
} from "@/lib/api";
import { isValidUpiId } from "@/lib/upi";
import { toast } from "sonner";

function getInitials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const Profile = () => {
  const userData = getStoredUser();
  const [name, setName] = useState(userData?.name || "");
  const [email, setEmail] = useState(userData?.email || "");
  const [upiId, setUpiId] = useState(userData?.upiId || "");
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState({ groups: 0, youOwe: 0, youAreOwed: 0 });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const cached = readCachedAuthResponse("/api/users/me");
      if (cached?.user) {
        setStats(cached.stats || { groups: 0, youOwe: 0, youAreOwed: 0 });
        setName(cached.user.name || "");
        setEmail(cached.user.email || "");
        setUpiId(cached.user.upiId || "");
      }

      try {
        const data = await authApiRequest("/api/users/me");
        setStats(data.stats || { groups: 0, youOwe: 0, youAreOwed: 0 });
        setName(data.user.name || "");
        setEmail(data.user.email || "");
        setUpiId(data.user.upiId || "");
        writeCachedAuthResponse("/api/users/me", data);
      } catch (err) {
        if (!cached) toast.error("Failed to load profile");
      }
    }

    loadProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!email || !email.trim()) {
      toast.error("Email is required");
      return;
    }

    // Basic email validation
    if (!email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    if (upiId.trim() && !isValidUpiId(upiId.trim())) {
      toast.error("Please enter a valid UPI ID");
      return;
    }

    try {
      setIsSaving(true);
      const response = await authApiRequest("/api/users/me", {
        method: "PUT",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          upiId: upiId.trim(),
          ...(password && { password }),
        }),
      });

      if (!response || !response.user) {
        throw new Error("Invalid response from server");
      }

      // Update localStorage with new user data
      setAuthSession({ user: response.user });
      setPassword("");
      toast.success("Profile updated successfully!");
    } catch (err) {
      console.error("Error updating profile:", err);
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl border border-border p-6 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-primary-foreground">{getInitials(name)}</span>
          </div>
          <h1 className="text-2xl font-bold font-display">{name}</h1>
          <p className="text-muted-foreground">{email}</p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">You owe</p>
              <p className="font-display font-bold text-red-600">
                ₹{stats.youOwe.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">You're owed</p>
              <p className="font-display font-bold text-green-600">
                ₹{stats.youAreOwed.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-secondary/50">
              <p className="text-xs text-muted-foreground">Groups</p>
              <p className="font-display font-bold">{stats.groups}</p>
            </div>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl border border-border p-6 space-y-4"
          onSubmit={handleSubmit}
        >
          <h2 className="font-display font-semibold text-lg">Edit Profile</h2>

          <div className="space-y-2">
            <Label>Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>UPI ID</Label>
            <div className="relative">
              <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                className="pl-10"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSaving}
            className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.form>
      </div>
    </AppLayout>
  );
};

export default Profile;
