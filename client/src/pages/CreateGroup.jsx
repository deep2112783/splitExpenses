import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/layout/AppLayout";
import { authApiRequest } from "@/lib/api";
import { toast } from "sonner";

const categories = [
  { value: "trip", label: "Trip", icon: "✈️" },
  { value: "vacation", label: "Vacation", icon: "🏖️" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧‍👦" },
  { value: "roommates", label: "Roommates", icon: "🏠" },
  { value: "friends", label: "Friends", icon: "🍕" },
  { value: "other", label: "Other", icon: "📋" },
];

const CreateGroup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("trip");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Get the current input value (don't trust state in validation)
    const formData = new FormData(e.target);
    const groupName = formData.get("name") || name;
    const groupDesc = formData.get("description") || description;

    console.log("Form submission - groupName:", groupName, "name state:", name);

    // Validate
    const trimmedName = groupName ? String(groupName).trim() : "";
    
    if (!trimmedName) {
      const errMsg = "Group name is required";
      setErrors({ name: errMsg });
      toast.error(errMsg);
      console.log("Validation failed: name is empty");
      return;
    }

    if (trimmedName.length < 2) {
      const errMsg = "Group name must be at least 2 characters";
      setErrors({ name: errMsg });
      toast.error(errMsg);
      return;
    }

    try {
      setIsLoading(true);
      const response = await authApiRequest("/api/groups", {
        method: "POST",
        body: JSON.stringify({
          name: trimmedName,
          description: (groupDesc || "").toString().trim(),
          category,
        }),
      });

      console.log("Group creation response:", response);

      if (!response || !response.group) {
        throw new Error("Invalid response from server");
      }

      toast.success(`Group "${trimmedName}" created! Code: ${response.group.code}`);
      // Use _id or id from response
      const groupId = response.group.id || response.group._id;
      
      // Reset form
      setName("");
      setDescription("");
      setCategory("trip");
      
      navigate(`/groups/${groupId}`);
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error(err.message || "Failed to create group");
      setErrors({ submit: err.message || "Failed to create group" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold font-display mb-6">Create New Group</h1>
        <form onSubmit={handleSubmit} className="space-y-5 bg-card rounded-2xl border border-border p-6">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Goa Trip 2026"
              type="text"
              value={name}
              onChange={(e) => {
                const val = e.target.value;
                setName(val);
                // Clear error as user types
                if (val.trim()) {
                  setErrors({...errors, name: ""});
                }
              }}
              disabled={isLoading}
              className={errors.name ? "border-destructive" : ""}
              required
              autoFocus
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              name="description"
              placeholder="What's this group for?"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.submit) {
                  setErrors({ ...errors, submit: "" });
                }
              }}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                    category === cat.value
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border hover:border-primary/30"
                  } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <span>{cat.icon}</span> {cat.label}
                </button>
              ))}
            </div>
          </div>

          {errors.submit && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {errors.submit}
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow"
          >
            {isLoading ? "Creating..." : "Create Group"}
          </Button>
        </form>
      </motion.div>
    </AppLayout>
  );
};

export default CreateGroup;