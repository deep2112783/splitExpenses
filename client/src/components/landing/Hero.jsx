import { motion } from "framer-motion";
import { ArrowRight, Split, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const Hero = () => {
  return (/*#__PURE__*/
    _jsxs("section", { className: "relative min-h-[90vh] flex items-center overflow-hidden", children: [/*#__PURE__*/

      _jsx("div", { className: "absolute inset-0 bg-gradient-hero opacity-5" }), /*#__PURE__*/
      _jsx("div", { className: "absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" }), /*#__PURE__*/
      _jsx("div", { className: "absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" }), /*#__PURE__*/

      _jsx("div", { className: "container relative z-10 py-20", children: /*#__PURE__*/
        _jsxs("div", { className: "grid lg:grid-cols-2 gap-16 items-center", children: [/*#__PURE__*/
          _jsxs(motion.div, {
            initial: { opacity: 0, y: 30 },
            animate: { opacity: 1, y: 0 },
            transition: { duration: 0.7 }, children: [/*#__PURE__*/

            _jsxs("div", { className: "inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6", children: [/*#__PURE__*/
              _jsx(Split, { className: "w-4 h-4" }), "Smart Expense Splitting"] }

            ), /*#__PURE__*/
            _jsxs("h1", { className: "text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6", children: ["Split bills,",
              " ", /*#__PURE__*/
              _jsx("span", { className: "text-gradient", children: "not friendships." })] }
            ), /*#__PURE__*/
            _jsx("p", { className: "text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed", children: "Track shared expenses, settle debts instantly with UPI, and keep your groups financially in sync \u2014 all in one beautiful app." }


            ), /*#__PURE__*/
            _jsxs("div", { className: "flex flex-wrap gap-4", children: [/*#__PURE__*/
              _jsx(Button, { asChild: true, size: "lg", className: "bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity px-8 h-12 text-base rounded-xl", children: /*#__PURE__*/
                _jsxs(Link, { to: "/signup", children: ["Get Started Free ", /*#__PURE__*/
                  _jsx(ArrowRight, { className: "w-4 h-4 ml-2" })] }
                ) }
              ), /*#__PURE__*/
              _jsx(Button, { asChild: true, variant: "outline", size: "lg", className: "h-12 text-base rounded-xl px-8", children: /*#__PURE__*/
                _jsx(Link, { to: "/login", children: "Sign In" }) }
              )] }
            )] }
          ), /*#__PURE__*/

          _jsx(motion.div, {
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            transition: { duration: 0.7, delay: 0.2 },
            className: "hidden lg:block", children: /*#__PURE__*/

            _jsxs("div", { className: "relative", children: [/*#__PURE__*/

              _jsxs(motion.div, {
                animate: { y: [-5, 5, -5] },
                transition: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                className: "glass rounded-2xl p-6 shadow-lg max-w-sm mx-auto", children: [/*#__PURE__*/

                _jsxs("div", { className: "flex items-center gap-3 mb-4", children: [/*#__PURE__*/
                  _jsx("div", { className: "w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center", children: /*#__PURE__*/
                    _jsx(Users, { className: "w-5 h-5 text-primary-foreground" }) }
                  ), /*#__PURE__*/
                  _jsxs("div", { children: [/*#__PURE__*/
                    _jsx("p", { className: "font-display font-semibold", children: "Goa Trip 2026" }), /*#__PURE__*/
                    _jsx("p", { className: "text-sm text-muted-foreground", children: "5 members" })] }
                  )] }
                ), /*#__PURE__*/
                _jsx("div", { className: "space-y-3", children:
                  [
                  { name: "Priya", amount: "₹2,400", type: "owes" },
                  { name: "Rahul", amount: "₹600", type: "owes" },
                  { name: "You", amount: "₹1,200", type: "get back" }].
                  map((item) => /*#__PURE__*/
                  _jsxs("div", { className: "flex justify-between items-center py-2 px-3 rounded-lg bg-secondary/50", children: [/*#__PURE__*/
                    _jsx("span", { className: "text-sm font-medium", children: item.name }), /*#__PURE__*/
                    _jsxs("span", { className: `text-sm font-semibold ${item.type === "owes" ? "text-owe" : "text-owed"}`, children: [
                      item.type === "owes" ? "-" : "+", item.amount] }
                    )] }, item.name
                  )
                  ) }
                )] }
              ), /*#__PURE__*/

              _jsx(motion.div, {
                animate: { y: [5, -5, 5] },
                transition: { duration: 3.5, repeat: Infinity, ease: "easeInOut" },
                className: "absolute -bottom-8 -left-8 glass rounded-2xl p-4 shadow-lg", children: /*#__PURE__*/

                _jsxs("div", { className: "flex items-center gap-3", children: [/*#__PURE__*/
                  _jsx("div", { className: "w-10 h-10 rounded-full bg-owed/10 flex items-center justify-center", children: /*#__PURE__*/
                    _jsx(Wallet, { className: "w-5 h-5 text-owed" }) }
                  ), /*#__PURE__*/
                  _jsxs("div", { children: [/*#__PURE__*/
                    _jsx("p", { className: "text-xs text-muted-foreground", children: "You're owed" }), /*#__PURE__*/
                    _jsx("p", { className: "font-display font-bold text-owed text-lg", children: "\u20B93,600" })] }
                  )] }
                ) }
              )] }
            ) }
          )] }
        ) }
      )] }
    ));

};

export default Hero;