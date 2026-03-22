import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import AppLayout from "@/components/layout/AppLayout";
import { formatCurrency } from "@/lib/mock-data";
import { authApiRequest } from "@/lib/api";
import { toast } from "sonner";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const expenseCategories = ["Food", "Accommodation", "Transport", "Bills", "Entertainment", "Shopping", "Other"];

const AddExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [splitType, setSplitType] = useState("equal");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("Food");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [customSplits, setCustomSplits] = useState({});

  useEffect(() => {
    const loadGroup = async () => {
      setLoading(true);
      try {
        const data = await authApiRequest(`/api/groups/${id}`);
        setGroup(data.group);
        if (data.group.members.length > 0) {
          setPaidBy(data.group.members[0].user.id);
          // Initialize custom splits
          const splits = {};
          data.group.members.forEach(m => {
            splits[m.user.id] = "";
          });
          setCustomSplits(splits);
        }
      } catch (err) {
        console.error("Error loading group:", err);
        toast.error(err.message || "Failed to load group");
        setGroup(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadGroup();
  }, [id]);

  if (loading) {
    return /*#__PURE__*/_jsx(AppLayout, { children: /*#__PURE__*/_jsx("div", { className: "flex items-center justify-center py-12", children: /*#__PURE__*/_jsx("p", { className: "text-muted-foreground", children: "Loading group..." }) }) });
  }

  if (!group) {
    return /*#__PURE__*/_jsx(AppLayout, { children: /*#__PURE__*/_jsx("p", { children: "Group not found" }) });
  }

  const perPerson = amount ? parseFloat(amount) / group.members.length : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast.error("Please enter expense title");
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (splitType === "custom") {
      const total = Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
      if (Math.abs(total - parseFloat(amount)) > 0.01) {
        toast.error(`Split total (${formatCurrency(total)}) doesn't match expense amount (${formatCurrency(parseFloat(amount))})`);
        return;
      }
    }

    setSubmitting(true);
    try {
      await authApiRequest(`/api/groups/${id}/expenses`, {
        method: "POST",
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          paidBy,
          category,
          date,
          notes,
          splitType,
          customSplits
        })
      });
      toast.success("Expense added successfully!");
      navigate(`/groups/${id}`);
    } catch (err) {
      console.error("Error adding expense:", err);
      toast.error(err.message || "Failed to add expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (/*#__PURE__*/
    _jsx(AppLayout, { children: /*#__PURE__*/
      _jsxs(motion.div, { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, className: "max-w-lg mx-auto", children: [/*#__PURE__*/
        _jsx("h1", { className: "text-2xl font-bold font-display mb-6", children: "Add Expense" }), /*#__PURE__*/
        _jsxs("form", { onSubmit: handleSubmit, className: "space-y-5 bg-card rounded-2xl border border-border p-6", children: [/*#__PURE__*/
          _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
            _jsx(Label, { children: "Title" }), /*#__PURE__*/
            _jsx(Input, { placeholder: "e.g., Dinner at restaurant", required: true, value: title, onChange: (e) => setTitle(e.target.value) })] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
            _jsx(Label, { children: "Amount (\u20B9)" }), /*#__PURE__*/
            _jsx(Input, { type: "number", placeholder: "0", value: amount, onChange: (e) => setAmount(e.target.value), required: true, min: "1" })] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [/*#__PURE__*/
            _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
              _jsx(Label, { children: "Paid by" }), /*#__PURE__*/
              _jsx("select", { className: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm", value: paidBy, onChange: (e) => setPaidBy(e.target.value), children:
                group.members.map((m) => /*#__PURE__*/
                _jsx("option", { value: m.user.id, children: m.user.name }, m.user.id)
                ) }
              )] }
            ), /*#__PURE__*/
            _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
              _jsx(Label, { children: "Category" }), /*#__PURE__*/
              _jsx("select", { className: "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm", value: category, onChange: (e) => setCategory(e.target.value), children:
                expenseCategories.map((c) => /*#__PURE__*/
                _jsx("option", { value: c, children: c }, c)
                ) }
              )] }
            )] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
            _jsx(Label, { children: "Date" }), /*#__PURE__*/
            _jsx(Input, { type: "date", value: date, onChange: (e) => setDate(e.target.value) })] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "space-y-2", children: [/*#__PURE__*/
            _jsx(Label, { children: "Notes (optional)" }), /*#__PURE__*/
            _jsx(Textarea, { placeholder: "Any additional details...", rows: 2, value: notes, onChange: (e) => setNotes(e.target.value) })] }
          ), /*#__PURE__*/


          _jsxs("div", { className: "space-y-3", children: [/*#__PURE__*/
            _jsx(Label, { children: "Split Method" }), /*#__PURE__*/
            _jsx("div", { className: "flex gap-2", children:
              ["equal", "custom"].map((type) => /*#__PURE__*/
              _jsxs("button", { type: "button", onClick: () => setSplitType(type),
                className: `flex-1 py-3 px-4 rounded-xl border text-sm font-medium capitalize transition-all ${
                splitType === type ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`, children: [

                type, " Split"] }, type
              )
              ) }
            )] }
          ), /*#__PURE__*/


          _jsxs("div", { className: "bg-secondary/30 rounded-xl p-4 space-y-2", children: [
            group.members.map((m) => /*#__PURE__*/
            _jsxs("div", { className: "flex items-center justify-between py-2", children: [/*#__PURE__*/
              _jsx("span", { className: "text-sm font-medium", children: m.user.name }),
              splitType === "equal" ? /*#__PURE__*/
              _jsx("span", { className: "text-sm font-semibold text-primary", children: amount ? formatCurrency(perPerson) : "₹0" }) : /*#__PURE__*/

              _jsx(Input, { type: "number", placeholder: "0", className: "w-28 h-8 text-sm",
                value: customSplits[m.user.id] || "",
                onChange: (e) => setCustomSplits({ ...customSplits, [m.user.id]: e.target.value }) })] }, m.user.id

            )
            ),
            splitType === "custom" && amount && /*#__PURE__*/
            _jsxs("div", { className: "border-t border-border pt-2 flex justify-between text-sm", children: [/*#__PURE__*/
              _jsx("span", { className: "text-muted-foreground", children: "Total assigned" }), /*#__PURE__*/
              _jsxs("span", { className: "font-semibold", children: [
                formatCurrency(Object.values(customSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0)), " / ", formatCurrency(parseFloat(amount))] }
              )] }
            )] }

          ), /*#__PURE__*/

          _jsx(Button, { type: "submit", disabled: submitting, className: "w-full bg-gradient-primary text-primary-foreground rounded-xl h-11 shadow-glow", children: submitting ? "Adding..." : "Add Expense" }

          )] }
        )] }
      ) }
    ));

};

export default AddExpense;