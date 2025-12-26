import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Package, History, Search, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/shared/Header';
import { DrugCard } from '@/components/shared/DrugCard';
import { TransactionLogCard } from '@/components/shared/TransactionLog';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

type Tab = 'drugs' | 'logs' | 'add';

const AdminDashboard = () => {
  const { drugs, transactionLogs, addDrug, isLoading, role } = useBlockchain();
  const [activeTab, setActiveTab] = useState<Tab>('drugs');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDrug, setNewDrug] = useState({ name: '', quantity: '', expiryDate: '' });
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not admin
  if (role !== 'admin') {
    navigate('/');
    return null;
  }

  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDrug = async () => {
    if (!newDrug.name || !newDrug.quantity || !newDrug.expiryDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    const success = await addDrug(
      newDrug.name,
      parseInt(newDrug.quantity),
      new Date(newDrug.expiryDate)
    );

    if (success) {
      toast({
        title: 'Success',
        description: 'Drug added to blockchain successfully',
      });
      setNewDrug({ name: '', quantity: '', expiryDate: '' });
      setShowAddModal(false);
      setActiveTab('drugs');
    }
  };

  const stats = [
    { label: 'Total Drugs', value: drugs.length, icon: Package },
    { label: 'Total Transactions', value: transactionLogs.length, icon: History },
    { 
      label: 'Expired', 
      value: drugs.filter(d => d.expiryDate < Date.now()).length,
      icon: Calendar,
    },
  ];

  return (
    <PageTransition className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {stats.map((stat, index) => (
            <StaggerItem key={stat.label}>
              <motion.div
                whileHover={{ y: -2 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <stat.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Tabs & Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'drugs' ? 'default' : 'secondary'}
              onClick={() => setActiveTab('drugs')}
            >
              <Package className="h-4 w-4 mr-2" />
              Drug Inventory
            </Button>
            <Button
              variant={activeTab === 'logs' ? 'default' : 'secondary'}
              onClick={() => setActiveTab('logs')}
            >
              <History className="h-4 w-4 mr-2" />
              Transaction Logs
            </Button>
          </div>

          <Button variant="success" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Drug
          </Button>
        </div>

        {/* Search */}
        {activeTab === 'drugs' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-6"
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drugs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </motion.div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'drugs' && (
            <motion.div
              key="drugs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredDrugs.map((drug, index) => (
                <motion.div
                  key={drug.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <DrugCard drug={drug} />
                </motion.div>
              ))}
              {filteredDrugs.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No drugs found</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'logs' && (
            <motion.div
              key="logs"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              {transactionLogs.map((log, index) => (
                <TransactionLogCard key={log.id} log={log} index={index} />
              ))}
              {transactionLogs.length === 0 && (
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions yet</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Add Drug Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Add New Drug</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddModal(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="drugName">Drug Name</Label>
                  <Input
                    id="drugName"
                    placeholder="e.g., Paracetamol 500mg"
                    value={newDrug.name}
                    onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    placeholder="e.g., 1000"
                    value={newDrug.quantity}
                    onChange={(e) => setNewDrug({ ...newDrug, quantity: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="expiryDate">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    value={newDrug.expiryDate}
                    onChange={(e) => setNewDrug({ ...newDrug, expiryDate: e.target.value })}
                  />
                </div>

                <Button
                  onClick={handleAddDrug}
                  disabled={isLoading}
                  className="w-full"
                  variant="success"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-success-foreground/30 border-t-success-foreground rounded-full"
                      />
                      Processing Transaction...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Blockchain
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  This action will create an immutable record on the blockchain
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default AdminDashboard;
