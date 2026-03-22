import { Link, useLocation } from "react-router-dom";
import { Split, Bell, User, Home, Users, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotificationsCount } from "@/hooks/use-notifications-count";import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";

const Navbar = ({ isAuth = false }) => {
  const location = useLocation();
  const { unreadCount } = useNotificationsCount();

  if (!isAuth) {
    return (/*#__PURE__*/
      _jsx("nav", { className: "sticky top-0 z-50 glass", children: /*#__PURE__*/
        _jsxs("div", { className: "container flex items-center justify-between h-16", children: [/*#__PURE__*/
          _jsxs(Link, { to: "/", className: "flex items-center gap-2", children: [/*#__PURE__*/
            _jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center", children: /*#__PURE__*/
              _jsx(Split, { className: "w-4 h-4 text-primary-foreground" }) }
            ), /*#__PURE__*/
            _jsx("span", { className: "font-display font-bold text-xl", children: "SplitSmart" })] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "flex gap-3", children: [/*#__PURE__*/
            _jsx(Button, { asChild: true, variant: "ghost", size: "sm", children: /*#__PURE__*/
              _jsx(Link, { to: "/login", children: "Sign In" }) }
            ), /*#__PURE__*/
            _jsx(Button, { asChild: true, size: "sm", className: "bg-gradient-primary text-primary-foreground rounded-xl", children: /*#__PURE__*/
              _jsx(Link, { to: "/signup", children: "Get Started" }) }
            )] }
          )] }
        ) }
      ));

  }

  const navItems = [
  { to: "/dashboard", icon: Home, label: "Home" },
  { to: "/groups", icon: Users, label: "Groups" },
  { to: "/notifications", icon: Bell, label: "Alerts", badge: unreadCount },
  { to: "/profile", icon: User, label: "Profile" }];


  return (/*#__PURE__*/
    _jsxs(_Fragment, { children: [/*#__PURE__*/

      _jsx("nav", { className: "sticky top-0 z-50 glass hidden md:block", children: /*#__PURE__*/
        _jsxs("div", { className: "container flex items-center justify-between h-16", children: [/*#__PURE__*/
          _jsxs(Link, { to: "/dashboard", className: "flex items-center gap-2", children: [/*#__PURE__*/
            _jsx("div", { className: "w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center", children: /*#__PURE__*/
              _jsx(Split, { className: "w-4 h-4 text-primary-foreground" }) }
            ), /*#__PURE__*/
            _jsx("span", { className: "font-display font-bold text-xl", children: "SplitSmart" })] }
          ), /*#__PURE__*/
          _jsxs("div", { className: "flex items-center gap-1", children: [
            navItems.map((item) => /*#__PURE__*/
            _jsx(Button, {

              asChild: true,
              variant: location.pathname === item.to ? "secondary" : "ghost",
              size: "sm",
              className: "relative", children: /*#__PURE__*/

              _jsxs(Link, { to: item.to, className: "flex items-center gap-2", children: [/*#__PURE__*/
                _jsx(item.icon, { className: "w-4 h-4" }),
                item.label,
                item.badge ? /*#__PURE__*/
                _jsx("span", { className: "absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center", children:
                  item.badge }
                ) :
                null] }
              ) }, item.to
            )
            ), /*#__PURE__*/
            _jsx(Button, { asChild: true, variant: "ghost", size: "sm", children: /*#__PURE__*/
              _jsx(Link, { to: "/", children: /*#__PURE__*/_jsx(LogOut, { className: "w-4 h-4" }) }) }
            )] }
          )] }
        ) }
      ), /*#__PURE__*/


      _jsx("nav", { className: "fixed bottom-0 left-0 right-0 z-50 glass md:hidden border-t border-border", children: /*#__PURE__*/
        _jsx("div", { className: "flex items-center justify-around h-16", children:
          navItems.map((item) => /*#__PURE__*/
          _jsxs(Link, {

            to: item.to,
            className: `flex flex-col items-center gap-1 px-3 py-2 rounded-lg relative transition-colors ${
            location.pathname === item.to ? "text-primary" : "text-muted-foreground"}`, children: [/*#__PURE__*/


            _jsx(item.icon, { className: "w-5 h-5" }), /*#__PURE__*/
            _jsx("span", { className: "text-xs font-medium", children: item.label }),
            item.badge ? /*#__PURE__*/
            _jsx("span", { className: "absolute top-0 right-0 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center", children:
              item.badge }
            ) :
            null] }, item.to
          )
          ) }
        ) }
      )] }
    ));

};

export default Navbar;