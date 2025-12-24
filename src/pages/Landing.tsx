import { motion } from 'framer-motion';
import { useState } from 'react';
import { Shield, Wallet, ChevronRight, Database, Lock, FileCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useBlockchain } from '@/contexts/BlockchainContext';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { useNavigate } from 'react-router-dom';
import { Waves } from '@/components/ui/waves-background';

const Landing = () => {
  const { connectWallet, isLoading, isConnected, setRole, error } = useBlockchain();
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const navigate = useNavigate();

  const handleConnect = async () => {
    await connectWallet();
    setShowRoleSelect(true);
  };

  const handleRoleSelect = (role: 'admin' | 'pharmacy') => {
    setRole(role);
    navigate(role === 'admin' ? '/admin' : '/pharmacy');
  };

  const features = [
    {
      icon: Database,
      title: 'Immutable Records',
      description: 'All drug transactions stored on blockchain, preventing tampering',
    },
    {
      icon: Lock,
      title: 'Role-Based Access',
      description: 'Smart contract enforced permissions for admins and pharmacy staff',
    },
    {
      icon: FileCheck,
      title: 'Audit Trail',
      description: 'Complete transaction history with timestamps and addresses',
    },
  ];

  return (
    <PageTransition className="relative min-h-screen">
      {/* Fixed wave background - always visible */}
      <div className="fixed inset-0 z-0">
        <Waves
          backgroundColor="transparent"
          waveSpeedX={0.0125}
          waveSpeedY={0.005}
          waveAmpX={32}
          waveAmpY={16}
          friction={0.925}
          tension={0.005}
          maxCursorMove={100}
          xGap={10}
          yGap={32}
        />
      </div>
      
      {/* All content with relative positioning and higher z-index */}
      <div className="relative z-10">
        {/* Theme Toggle - Fixed position in top right */}
        <div className="fixed top-4 right-4 z-50">
          <ThemeToggle />
        </div>

        {/* Hero Section */}
        <div className="relative overflow-hidden bg-transparent">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-3xl opacity-30" />
          </div>

        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center">
            <StaggerContainer delay={0.2}>
              <StaggerItem>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-bg shadow-lg mb-8"
                >
                  <Shield className="w-10 h-10 text-primary-foreground" />
                </motion.div>
              </StaggerItem>

              <StaggerItem>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                  <span className="gradient-text">MediChain</span>
                  <br />
                  <span className="text-foreground/80">Drug Inventory System</span>
                </h1>
              </StaggerItem>

              <StaggerItem>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
                  A blockchain-based solution for tamper-proof drug inventory tracking 
                  and accountability in hospital pharmacy management.
                </p>
              </StaggerItem>

              <StaggerItem>
                {!isConnected ? (
                  <Button
                    variant="hero"
                    size="xl"
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="group"
                  >
                    {isLoading ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                        />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5" />
                        Connect Wallet
                        <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                ) : showRoleSelect ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <p className="text-muted-foreground mb-4">Select your role to continue:</p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button
                        variant="default"
                        size="lg"
                        onClick={() => handleRoleSelect('admin')}
                        className="min-w-[200px]"
                      >
                        <Shield className="w-5 h-5 mr-2" />
                        Admin Dashboard
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => handleRoleSelect('pharmacy')}
                        className="min-w-[200px]"
                      >
                        <Database className="w-5 h-5 mr-2" />
                        Pharmacy Staff
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
              </StaggerItem>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-destructive mt-4"
                >
                  {error}
                </motion.p>
              )}
            </StaggerContainer>
          </div>
        </div>
        </div>

        {/* Features Section */}
        <section className="py-20 bg-transparent">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Why Blockchain for Drug Inventory?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Traditional systems allow record manipulation. Blockchain ensures 
                every transaction is permanent and verifiable.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.4 }}
                  whileHover={{ y: -4 }}
                  className="glass-card rounded-2xl p-6 text-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm"
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-4">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border/50 bg-transparent">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm text-muted-foreground">
              Final Year Academic Project — Blockchain-Based Drug Inventory Management
            </p>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
};

export default Landing;
