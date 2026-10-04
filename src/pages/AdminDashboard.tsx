import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Plus, Package, History, Search, X, Calendar, Upload, BarChart, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/shared/Header';
import { DrugCard } from '@/components/shared/DrugCard';
import { StockActions } from '@/components/shared/StockActions';
import { StaffManagement } from '@/components/shared/StaffManagement';
import { TransactionLogCard } from '@/components/shared/TransactionLog';
import AnalyticsDashboard from '@/components/shared/AnalyticsDashboard';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { useBlockchain } from '@/hooks/useBlockchain';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { CSVImportModal } from '@/components/CSVImportModal';
import { DrugImportRow } from '@/utils/csvParser';
import { isFutureExpiry } from '@/utils/dates';

type Tab = 'drugs' | 'logs' | 'analytics' | 'staff';

const EMPTY_DRUG = { name: '', batchNumber: '', registrationNumber: '', quantity: '', expiryDate: '' };

const AdminDashboard = () => {
  const { drugs, transactionLogs, addDrug, importDrugsBatch, isLoading, role, error } = useBlockchain();
  const [activeTab, setActiveTab] = useState<Tab>('drugs');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [csvImporting, setCSVImporting] = useState(false);
  const [newDrug, setNewDrug] = useState(EMPTY_DRUG);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not admin
  if (role !== 'admin') {
    navigate('/');
    return null;
  }

  // Show loading overlay while fetching drugs
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 z-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary border-solid mb-6" />
        <p className="text-lg text-foreground font-semibold">Loading drugs from blockchain...</p>
      </div>
    );
  }

  const filteredDrugs = drugs.filter(drug =>
    drug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDrug = async () => {
    if (!newDrug.name.trim() || !newDrug.batchNumber.trim() || !newDrug.quantity || !newDrug.expiryDate) {
      toast({
        title: 'Error',
        description: 'Name, batch number, quantity and expiry date are required',
        variant: 'destructive',
      });
      return;
    }

    const quantity = parseInt(newDrug.quantity, 10);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast({ title: 'Error', description: 'Quantity must be a positive whole number', variant: 'destructive' });
      return;
    }
    if (!isFutureExpiry(newDrug.expiryDate)) {
      toast({ title: 'Error', description: 'Expiry date must be in the future', variant: 'destructive' });
      return;
    }

    const success = await addDrug({
      name: newDrug.name.trim(),
      batchNumber: newDrug.batchNumber.trim(),
      registrationNumber: newDrug.registrationNumber.trim(),
      quantity,
      expiryDate: newDrug.expiryDate,
    });

    if (success) {
      toast({
        title: 'Success',
        description: 'Drug added to blockchain successfully',
      });
      setNewDrug(EMPTY_DRUG);
      setShowAddModal(false);
      setActiveTab('drugs');
    }
  };

  const handleCSVImport = async (rows: DrugImportRow[]): Promise<boolean> => {
    setCSVImporting(true);
    const success = await importDrugsBatch(
      rows.map(({ name, batchNumber, registrationNumber, quantity, expiryDate }) => ({
        name,
        batchNumber,
        registrationNumber,
        quantity,
        expiryDate,
      })),
    );
    setCSVImporting(false);

    if (success) {
      toast({
        title: 'Success',
        description: `Imported ${rows.length} drug${rows.length !== 1 ? 's' : ''} from CSV`,
      });
      setActiveTab('drugs');
    }
    return success;
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
        {error && (
          <div role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

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
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'secondary'}
              onClick={() => setActiveTab('analytics')}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Button
              variant={activeTab === 'staff' ? 'default' : 'secondary'}
              onClick={() => setActiveTab('staff')}
            >
              <Users className="h-4 w-4 mr-2" />
              Staff
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Button variant="secondary" onClick={() => setShowCSVImportModal(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="success" onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Drug
            </Button>
          </div>
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
                  <DrugCard drug={drug} footer={<StockActions drug={drug} />} />
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
          {activeTab === 'staff' && (
            <motion.div
              key="staff"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <StaffManagement />
            </motion.div>
          )}
          {activeTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <AnalyticsDashboard drugs={drugs} transactionLogs={transactionLogs} />
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="batchNumber">Batch number</Label>
                    <Input
                      id="batchNumber"
                      placeholder="e.g., BN-001"
                      maxLength={64}
                      value={newDrug.batchNumber}
                      onChange={(e) => setNewDrug({ ...newDrug, batchNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="registrationNumber">Reg. no. (optional)</Label>
                    <Input
                      id="registrationNumber"
                      placeholder="e.g., NAFDAC 04-1234"
                      maxLength={64}
                      value={newDrug.registrationNumber}
                      onChange={(e) => setNewDrug({ ...newDrug, registrationNumber: e.target.value })}
                    />
                  </div>
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

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={showCSVImportModal}
        onClose={() => setShowCSVImportModal(false)}
        onImport={handleCSVImport}
        isLoading={csvImporting}
      />
    </PageTransition>
  );
};

export default AdminDashboard;
