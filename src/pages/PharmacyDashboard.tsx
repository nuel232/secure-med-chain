import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Package, Search, Minus, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/shared/Header';
import { DrugCard } from '@/components/shared/DrugCard';
import { PageTransition, StaggerContainer, StaggerItem } from '@/components/layout/PageTransition';
import { useBlockchain, Drug } from '@/contexts/BlockchainContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const PharmacyDashboard = () => {
  const { drugs, dispenseDrug, isLoading, role, error } = useBlockchain();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [dispenseQuantity, setDispenseQuantity] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if not pharmacy
  if (role !== 'pharmacy') {
    navigate('/');
    return null;
  }

  const availableDrugs = drugs.filter(drug => drug.expiryDate >= Date.now());
  const filteredDrugs = availableDrugs.filter(drug =>
    drug.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDispense = async () => {
    if (!selectedDrug || !dispenseQuantity) {
      toast({
        title: 'Error',
        description: 'Please enter a quantity',
        variant: 'destructive',
      });
      return;
    }

    const qty = parseInt(dispenseQuantity);
    if (qty > selectedDrug.quantity) {
      toast({
        title: 'Error',
        description: 'Quantity exceeds available stock',
        variant: 'destructive',
      });
      return;
    }

    const success = await dispenseDrug(selectedDrug.id, qty);

    if (success) {
      toast({
        title: 'Success',
        description: `Dispensed ${qty} units of ${selectedDrug.name}`,
      });
      setSelectedDrug(null);
      setDispenseQuantity('');
    }
  };

  const expiredCount = drugs.filter(d => d.expiryDate < Date.now()).length;

  const stats = [
    { label: 'Available Drugs', value: availableDrugs.length, color: 'text-success' },
    { label: 'Expired (Blocked)', value: expiredCount, color: 'text-destructive' },
  ];

  return (
    <PageTransition className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <StaggerContainer className="grid grid-cols-2 gap-4 mb-8">
          {stats.map((stat) => (
            <StaggerItem key={stat.label}>
              <motion.div
                whileHover={{ y: -2 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Notice */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 p-4 mb-6"
        >
          <AlertTriangle className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            <strong>Pharmacy Staff Access:</strong> You can only view and dispense drugs. 
            Adding or modifying inventory requires Admin access.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative mb-6"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search available drugs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </motion.div>

        {/* Drug Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDrugs.map((drug, index) => (
            <motion.div
              key={drug.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <DrugCard
                drug={drug}
                showDispenseButton
                onDispense={(d) => setSelectedDrug(d)}
              />
            </motion.div>
          ))}
          {filteredDrugs.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No drugs available</p>
            </div>
          )}
        </div>
      </main>

      {/* Dispense Modal */}
      <AnimatePresence>
        {selectedDrug && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedDrug(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-foreground">Dispense Drug</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDrug(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-medium text-foreground">{selectedDrug.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Available: {selectedDrug.quantity} units
                  </p>
                </div>

                <div>
                  <Label htmlFor="dispenseQty">Quantity to Dispense</Label>
                  <Input
                    id="dispenseQty"
                    type="number"
                    placeholder="Enter quantity"
                    value={dispenseQuantity}
                    onChange={(e) => setDispenseQuantity(e.target.value)}
                    max={selectedDrug.quantity}
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  onClick={handleDispense}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                      />
                      Processing Transaction...
                    </>
                  ) : (
                    <>
                      <Minus className="h-4 w-4 mr-2" />
                      Confirm Dispense
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  This action will be permanently recorded on the blockchain
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
};

export default PharmacyDashboard;
