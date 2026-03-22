import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AppLayout from "@/components/layout/AppLayout";
import { authApiRequest, readCachedAuthResponse, writeCachedAuthResponse } from "@/lib/api";
import { toast } from "sonner";

const tabs = ["all", "active", "settled"];

const categoryIcons = {
  trip: "✈️",
  vacation: "🏖️",
  family: "👨‍👩‍👧‍👦",
  roommates: "🏠",
  friends: "🍕",
  other: "📋",
};

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [joinValue, setJoinValue] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    const cached = readCachedAuthResponse("/api/groups");
    if (cached?.groups) {
      setGroups(cached.groups);
      setIsLoading(false);
    }

    try {
      const data = await authApiRequest("/api/groups");
      setGroups(data.groups || []);
      writeCachedAuthResponse("/api/groups", data);
    } catch (err) {
      if (!cached) toast.error("Failed to load groups");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoinGroup() {
    const value = joinValue.trim();
    if (!value) {
      toast.error("Enter group code or group id");
      return;
    }

    try {
      setIsJoining(true);
      const response = await authApiRequest("/api/groups/join", {
        method: "POST",
        body: JSON.stringify({
          code: value,
          groupId: value,
        }),
      });

      toast.success(response.message || "Joined group successfully");
      setJoinValue("");
      await loadGroups();
    } catch (err) {
      toast.error(err.message || "Failed to join group");
    } finally {
      setIsJoining(false);
    }
  }

  const filtered = groups.filter((g) => {
    if (activeTab !== "all" && g.status !== activeTab) return false;
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6 animate-pulse">
          <div className="h-10 w-48 bg-secondary rounded-xl" />
          <div className="h-20 bg-card border border-border rounded-2xl" />
          <div className="h-10 bg-secondary rounded-xl" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="h-44 bg-card border border-border rounded-2xl" />
            <div className="h-44 bg-card border border-border rounded-2xl" />
            <div className="h-44 bg-card border border-border rounded-2xl" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-bold font-display">Groups</h1>
          <Button
            asChild
            className="bg-gradient-primary text-primary-foreground rounded-xl shadow-glow"
          >
            <Link to="/groups/create">
              <Plus className="w-4 h-4 mr-2" /> New Group
            </Link>
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 flex flex-col md:flex-row md:items-center gap-3">
          <div className="min-w-0 md:flex-1">
            <p className="text-sm font-medium">Join a group</p>
            <p className="text-xs text-muted-foreground">Use group code or group id</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 md:w-[440px]">
            <Input
              placeholder="Enter code (ABC123) or group id"
              value={joinValue}
              onChange={(e) => setJoinValue(e.target.value)}
              disabled={isJoining}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleJoinGroup();
                }
              }}
            />
            <Button onClick={handleJoinGroup} disabled={isJoining} className="rounded-xl">
              {isJoining ? "Joining..." : "Join"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search groups..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1 bg-secondary rounded-xl p-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-lg capitalize transition-colors ${
                  activeTab === tab
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                } whitespace-nowrap`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {groups.length === 0 ? "No groups yet. Create one to get started!" : "No groups match your search"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((group, i) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/groups/${group.id}`}
                  className="block bg-card rounded-2xl border border-border p-5 hover:border-primary/30 hover:shadow-glow transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{categoryIcons[group.category]}</span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold truncate">{group.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {group.members.length} members · {group.status}
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-muted-foreground">Your balance</p>
                      <p
                        className={`font-display font-bold ${
                          group.myBalance >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {group.myBalance >= 0 ? "+" : ""}
                        {formatCurrency(group.myBalance)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">Total: {formatCurrency(group.totalExpenses)}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Groups;