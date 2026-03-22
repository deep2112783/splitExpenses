import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Groups from "./pages/Groups";
import GroupDetail from "./pages/GroupDetail";
import CreateGroup from "./pages/CreateGroup";
import AddExpense from "./pages/AddExpense";
import Expenses from "./pages/Expenses";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Balances from "./pages/Balances";
import NotFound from "./pages/NotFound";import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";

const queryClient = new QueryClient();

const App = () => /*#__PURE__*/
_jsx(QueryClientProvider, { client: queryClient, children: /*#__PURE__*/
  _jsxs(TooltipProvider, { children: [/*#__PURE__*/
    _jsx(Toaster, {}), /*#__PURE__*/
    _jsx(Sonner, {}), /*#__PURE__*/
    _jsx(BrowserRouter, { children: /*#__PURE__*/
      _jsxs(Routes, { children: [/*#__PURE__*/
        _jsx(Route, { path: "/", element: /*#__PURE__*/_jsx(Landing, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/login", element: /*#__PURE__*/_jsx(Login, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/signup", element: /*#__PURE__*/_jsx(Signup, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/dashboard", element: /*#__PURE__*/_jsx(Dashboard, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/groups", element: /*#__PURE__*/_jsx(Groups, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/groups/create", element: /*#__PURE__*/_jsx(CreateGroup, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/groups/:id", element: /*#__PURE__*/_jsx(GroupDetail, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/groups/:id/add-expense", element: /*#__PURE__*/_jsx(AddExpense, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/expenses", element: /*#__PURE__*/_jsx(Expenses, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/notifications", element: /*#__PURE__*/_jsx(Notifications, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/balances", element: /*#__PURE__*/_jsx(Balances, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "/profile", element: /*#__PURE__*/_jsx(Profile, {}) }), /*#__PURE__*/
        _jsx(Route, { path: "*", element: /*#__PURE__*/_jsx(NotFound, {}) })] }
      ) }
    )] }
  ) }
);


export default App;