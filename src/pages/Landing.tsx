import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Shield, Wallet, ChevronRight, Database, Lock, FileCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBlockchain } from '@/hooks/useBlockchain';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { useNavigate } from 'react-router-dom';
import { Waves } from '@/components/ui/waves-background';

const DEPLOYER_ADDRESS = '0x2d4f73d89645c5558126cea3489c79f9498b5a66'; // Must match BlockchainContext

const Landing = () => {
  const { connectWallet, isLoading, isConnected, role, error, account } = useBlockchain();
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const navigate = useNavigate();

  // Check if current user is the deployer
  const isDeployer = account?.toLowerCase() === DEPLOYER_ADDRESS.toLowerCase();

  // Show role selection after wallet is connected
  useEffect(() => {
    if (isConnected && account) {
      // If deployer, always show role selection
      // If not deployer, show selection only if they have a role
      if (isDeployer || role !== null) {
        setShowRoleSelect(true);
      }
    }
  }, [isConnected, account, isDeployer, role]);

  const handleConnect = async () => {
    await connectWallet();
  };

  const handleRoleSelect = (selectedRole: 'admin' | 'pharmacy') => {
    navigate(selectedRole === 'admin' ? '/admin' : '/pharmacy');
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
    <PageTransition className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Wave Background */}
        <div className="absolute inset-0 -z-20 h-[600px] overflow-hidden">
          <Waves
            lineColor="rgba(255, 255, 255, 0.1)"
            backgroundColor="transparent"
            waveSpeedX={0.02}
            waveSpeedY={0.01}
            waveAmpX={40}
            waveAmpY={20}
            friction={0.9}
            tension={0.01}
            maxCursorMove={120}
            xGap={12}
            yGap={36}
            className="w-full h-full"
          />
        </div>

        {/* Background Pattern */}
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
                  <div>
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
                          Connecting to MetaMask...
                        </>
                      ) : (
                        <>
                          <Wallet className="w-5 h-5" />
                          Connect Wallet
                          <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
                    </Button>
                    <p className="text-sm text-muted-foreground mt-4">
                      Make sure MetaMask is installed and connected to the correct network
                    </p>
                  </div>
                ) : showRoleSelect ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl bg-muted/50 border border-border p-6 max-w-md mx-auto">
                      <p className="text-foreground font-medium mb-2">Connected Wallet:</p>
                      <p className="text-sm text-muted-foreground font-mono break-all mb-4">
                        {account}
                      </p>
                      
                      {/* Deployer has access to both dashboards */}
                      {isDeployer ? (
                        <div>
                          <div className="rounded-lg bg-success/10 border border-success/20 p-4 mb-6">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-5 h-5 text-success" />
                              <p className="text-success font-medium">
                                Contract Deployer Detected
                              </p>
                            </div>
                            <p className="text-success/80 text-sm">
                              As the contract deployer, you have full access to both Admin and Pharmacy dashboards.
                            </p>
                          </div>

                          <p className="text-muted-foreground mb-4">Choose your dashboard:</p>
                          <div className="flex flex-col gap-3">
                            <Button
                              variant="default"
                              size="lg"
                              onClick={() => handleRoleSelect('admin')}
                              className="w-full group"
                            >
                              <Shield className="w-5 h-5 mr-2" />
                              Admin Dashboard
                              <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="lg"
                              onClick={() => handleRoleSelect('pharmacy')}
                              className="w-full group"
                            >
                              <Users className="w-5 h-5 mr-2" />
                              Pharmacy Dashboard
                              <ChevronRight className="w-4 h-4 ml-auto group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      ) : role === 'admin' ? (
                        <div>
                          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-primary" />
                              <p className="text-primary font-medium">
                                Admin Role Detected
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="lg"
                            onClick={() => handleRoleSelect('admin')}
                            className="w-full"
                          >
                            <Shield className="w-5 h-5 mr-2" />
                            Go to Admin Dashboard
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </Button>
                        </div>
                      ) : role === 'pharmacy' ? (
                        <div>
                          <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 mb-4">
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5 text-primary" />
                              <p className="text-primary font-medium">
                                Pharmacy Staff Role Detected
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="default"
                            size="lg"
                            onClick={() => handleRoleSelect('pharmacy')}
                            className="w-full"
                          >
                            <Database className="w-5 h-5 mr-2" />
                            Go to Pharmacy Dashboard
                            <ChevronRight className="w-4 h-4 ml-auto" />
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-4">
                          <p className="text-destructive text-sm font-medium mb-2">
                            ⚠️ No Role Assigned
                          </p>
                          <p className="text-destructive/80 text-xs">
                            This wallet does not have admin or pharmacy staff permissions.
                            <br />
                            <br />
                            Contact the contract administrator (deployer) to assign you a role using the <code className="bg-destructive/20 px-1 rounded">assignRole()</code> function.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </StaggerItem>

              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-6 rounded-xl bg-destructive/10 border border-destructive/20 p-4 max-w-md mx-auto"
                >
                  <p className="text-destructive text-sm font-medium mb-2">
                    ⚠️ Error
                  </p>
                  <p className="text-destructive/80 text-xs">
                    {error}
                  </p>
                </motion.div>
              )}
            </StaggerContainer>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
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
                className="glass-card rounded-2xl p-6 text-center"
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
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Final Year Academic Project — Blockchain-Based Drug Inventory Management
          </p>
        </div>
      </footer>
    </PageTransition>
  );
};

export default Landing;