import { motion } from "framer-motion";
import { ArrowRight, Split, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero opacity-5" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container relative z-10 py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Split className="w-4 h-4" />
              Smart Expense Splitting
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-tight mb-6">
              Split bills, <span className="text-gradient">not friendships.</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Track shared expenses, settle balances clearly, and keep your groups financially in sync - all in one beautiful app.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-opacity px-8 h-12 text-base rounded-xl"
              >
                <Link to="/signup">
                  Get Started Free <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 text-base rounded-xl px-8">
                <Link to="/login">Sign In</Link>
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="glass rounded-2xl p-6 shadow-lg max-w-sm mx-auto"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">Goa Trip 2026</p>
                    <p className="text-sm text-muted-foreground">5 members</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: "Priya", amount: "₹2,400", type: "owes" },
                    { name: "Rahul", amount: "₹600", type: "owes" },
                    { name: "You", amount: "₹1,200", type: "get back" },
                  ].map((item) => (
                    <div key={item.name} className="flex justify-between items-center py-2 px-3 rounded-lg bg-secondary/50">
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className={`text-sm font-semibold ${item.type === "owes" ? "text-owe" : "text-owed"}`}>
                        {item.type === "owes" ? "-" : "+"}
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [5, -5, 5] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -left-8 glass rounded-2xl p-4 shadow-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-owed/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-owed" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">You're owed</p>
                    <p className="font-display font-bold text-owed text-lg">₹3,600</p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;