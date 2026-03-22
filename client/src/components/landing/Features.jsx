import { motion } from "framer-motion";
import { Split, Users, Wallet, Bell, Shield, Smartphone } from "lucide-react";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const features = [
{
  icon: Split,
  title: "Smart Splitting",
  description: "Split equally or customize amounts per person. The math is always right."
},
{
  icon: Users,
  title: "Group Management",
  description: "Create groups for trips, roommates, or family. Invite via code or email."
},
{
  icon: Wallet,
  title: "UPI Payments",
  description: "Settle debts instantly via Google Pay, PhonePe, or Paytm with one tap."
},
{
  icon: Bell,
  title: "Real-time Alerts",
  description: "Get notified when expenses are added, payments received, or requests made."
},
{
  icon: Shield,
  title: "Admin Controls",
  description: "Manage members, approve leave requests, and keep your groups organized."
},
{
  icon: Smartphone,
  title: "Mobile Optimized",
  description: "Works beautifully on every screen size. Split bills on the go."
}];


const Features = () => {
  return (/*#__PURE__*/
    _jsx("section", { className: "py-24 relative", children: /*#__PURE__*/
      _jsxs("div", { className: "container", children: [/*#__PURE__*/
        _jsxs(motion.div, {
          initial: { opacity: 0, y: 20 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true },
          className: "text-center mb-16", children: [/*#__PURE__*/

          _jsx("h2", { className: "text-3xl md:text-4xl font-bold font-display mb-4", children: "Everything you need to split smart" }

          ), /*#__PURE__*/
          _jsx("p", { className: "text-muted-foreground text-lg max-w-2xl mx-auto", children: "From tracking expenses to settling payments, SplitSmart handles it all." }

          )] }
        ), /*#__PURE__*/

        _jsx("div", { className: "grid md:grid-cols-2 lg:grid-cols-3 gap-6", children:
          features.map((feature, index) => /*#__PURE__*/
          _jsxs(motion.div, {

            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true },
            transition: { delay: index * 0.1 },
            className: "group p-6 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-glow transition-all duration-300", children: [/*#__PURE__*/

            _jsx("div", { className: "w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-all", children: /*#__PURE__*/
              _jsx(feature.icon, { className: "w-6 h-6 text-primary group-hover:text-primary-foreground" }) }
            ), /*#__PURE__*/
            _jsx("h3", { className: "font-display font-semibold text-lg mb-2", children: feature.title }), /*#__PURE__*/
            _jsx("p", { className: "text-muted-foreground text-sm leading-relaxed", children: feature.description })] }, feature.title
          )
          ) }
        )] }
      ) }
    ));

};

export default Features;