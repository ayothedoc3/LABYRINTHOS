import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { Textarea } from './components/ui/textarea';
import { ScrollArea } from './components/ui/scroll-area';
import { Separator } from './components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Progress } from './components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from './components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from './components/ui/select';
import {
  FileText, Scan, Upload, CheckCircle, Clock, Zap, Brain,
  RefreshCw, Eye, FileSearch, Sparkles, AlertTriangle, Download
} from 'lucide-react';

const API = import.meta.env.VITE_BACKEND_URL || '';

const DOC_TYPE_CONFIG = {
  invoice: { label: 'Invoice', icon: FileText, color: 'text-blue-500' },
  receipt: { label: 'Receipt', icon: FileText, color: 'text-green-500' },
  contract: { label: 'Contract', icon: FileText, color: 'text-purple-500' },
  form: { label: 'Form', icon: FileText, color: 'text-orange-500' },
  id: { label: 'ID Document', icon: FileText, color: 'text-red-500' }
};

const DocumentScanner = () => {
  const [documents, setDocuments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');
  
  // Smart Intake state
  const [smartIntakeInput, setSmartIntakeInput] = useState('');
  const [smartIntakeType, setSmartIntakeType] = useState('client_onboarding');
  const [intakeResult, setIntakeResult] = useState(null);
  const [processingIntake, setProcessingIntake] = useState(false);
  
  // Scan state
  const [scanType, setScanType] = useState('invoice');
  const [scanResult, setScanResult] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [docsRes, analyticsRes] = await Promise.all([
        axios.get(`${API}/api/ai-ocr/documents`),
        axios.get(`${API}/api/ai-ocr/analytics`)
      ]);
      setDocuments(docsRes.data.documents || []);
      setAnalytics(analyticsRes.data);
    } catch (err) {
      console.error('Error fetching OCR data:', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleScan = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await axios.post(`${API}/api/ai-ocr/scan`, {
        document_type: scanType,
        image_base64: null // Demo mode - will use mock data
      });
      setScanResult(res.data);
      fetchData(); // Refresh document list
    } catch (err) {
      console.error('Error scanning document:', err);
      alert(err.response?.data?.detail || 'Failed to scan document');
    }
    setScanning(false);
  };

  const handleSmartIntake = async () => {
    if (!smartIntakeInput.trim()) return;
    
    setProcessingIntake(true);
    setIntakeResult(null);
    try {
      const res = await axios.post(`${API}/api/ai-ocr/smart-intake`, {
        form_type: smartIntakeType,
        raw_input: smartIntakeInput
      });
      setIntakeResult(res.data);
    } catch (err) {
      console.error('Error processing intake:', err);
      alert(err.response?.data?.detail || 'Failed to process intake');
    }
    setProcessingIntake(false);
  };

  const handleValidate = async (documentId) => {
    try {
      const res = await axios.post(`${API}/api/ai-ocr/validate-extraction/${documentId}`);
      setSelectedDoc({ ...selectedDoc, validation: res.data.validation });
    } catch (err) {
      console.error('Error validating:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="document-scanner">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Scan className="w-8 h-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{analytics?.total_documents_scanned || 0}</div>
                <div className="text-xs text-muted-foreground">Documents Scanned</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.total_smart_extractions || 0}</div>
                <div className="text-xs text-muted-foreground">Smart Extractions</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{(analytics?.average_confidence_score * 100 || 0).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">{analytics?.average_processing_time_ms || 0}ms</div>
                <div className="text-xs text-muted-foreground">Avg Processing</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scan">
            <Scan className="w-4 h-4 mr-2" />
            Scan Document
          </TabsTrigger>
          <TabsTrigger value="smart-intake">
            <Sparkles className="w-4 h-4 mr-2" />
            Smart Intake
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileSearch className="w-4 h-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Scan Tab */}
        <TabsContent value="scan" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Scan Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Document Scanner</CardTitle>
                <CardDescription>Upload and extract data from documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Document Type</Label>
                  <Select value={scanType} onValueChange={setScanType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Invoice</SelectItem>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="id">ID Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag & drop a document here, or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">
                    (Demo mode: Uses simulated OCR data)
                  </p>
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleScan}
                  disabled={scanning}
                  data-testid="scan-document-btn"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 mr-2" />
                      Scan Document
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Result */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Extracted Data</CardTitle>
                <CardDescription>
                  {scanResult ? `Document ID: ${scanResult.document_id}` : 'Results will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scanResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className="capitalize">{scanResult.document_type}</Badge>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <Badge variant={scanResult.confidence_score > 0.9 ? 'default' : 'secondary'}>
                          {(scanResult.confidence_score * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                    
                    <Progress value={scanResult.confidence_score * 100} className="h-2" />
                    
                    <ScrollArea className="h-[250px]">
                      <div className="space-y-2">
                        {Object.entries(scanResult.extracted_fields || {}).map(([key, value]) => (
                          <div key={key} className="p-2 bg-muted/50 rounded">
                            <Label className="text-xs text-muted-foreground capitalize">
                              {key.replace(/_/g, ' ')}
                            </Label>
                            <p className="text-sm font-medium">
                              {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                    
                    <div className="text-xs text-muted-foreground">
                      Processing time: {scanResult.processing_time_ms}ms
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Scan a document to see extracted data</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Intake Tab */}
        <TabsContent value="smart-intake" className="mt-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Intake Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  AI Smart Intake
                </CardTitle>
                <CardDescription>Parse unstructured text into structured form data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Form Type</Label>
                  <Select value={smartIntakeType} onValueChange={setSmartIntakeType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client_onboarding">Client Onboarding</SelectItem>
                      <SelectItem value="contract_details">Contract Details</SelectItem>
                      <SelectItem value="expense_report">Expense Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Raw Input</Label>
                  <Textarea 
                    value={smartIntakeInput}
                    onChange={(e) => setSmartIntakeInput(e.target.value)}
                    placeholder="Paste unstructured text here...

Example for Client Onboarding:
'Just spoke with John Smith from Acme Corp, their email is john@acme.com and phone is 555-1234. They're in the tech industry, about 50 employees. Located at 123 Main St, New York.'"
                    rows={8}
                    data-testid="smart-intake-input"
                  />
                </div>
                
                <Button 
                  className="w-full" 
                  onClick={handleSmartIntake}
                  disabled={processingIntake || !smartIntakeInput.trim()}
                  data-testid="process-intake-btn"
                >
                  {processingIntake ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Process with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Intake Result */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Parsed Data</CardTitle>
                <CardDescription>
                  {intakeResult ? `Form: ${intakeResult.form_type}` : 'Structured data will appear here'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {intakeResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Badge className="capitalize">{intakeResult.form_type?.replace('_', ' ')}</Badge>
                      <Badge variant="outline">
                        {intakeResult.fields_found?.length || 0} fields extracted
                      </Badge>
                    </div>
                    
                    <ScrollArea className="h-[280px]">
                      <div className="space-y-2">
                        {Object.entries(intakeResult.parsed_data || {}).map(([key, value]) => {
                          if (key === 'parsing_notes') return null;
                          const isExpected = intakeResult.expected_fields?.includes(key);
                          return (
                            <div 
                              key={key} 
                              className={`p-2 rounded ${isExpected ? 'bg-green-500/10' : 'bg-muted/50'}`}
                            >
                              <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground capitalize">
                                  {key.replace(/_/g, ' ')}
                                </Label>
                                {isExpected && (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                              <p className="text-sm font-medium">
                                {value === null ? 
                                  <span className="text-muted-foreground italic">Not found</span> : 
                                  String(value)
                                }
                              </p>
                            </div>
                          );
                        })}
                        
                        {intakeResult.parsed_data?.parsing_notes && (
                          <div className="p-2 bg-blue-500/10 rounded mt-4">
                            <Label className="text-xs text-muted-foreground">AI Notes</Label>
                            <p className="text-sm">{intakeResult.parsed_data.parsing_notes}</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Enter text and process to see parsed data</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="mt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Scanned Documents</h3>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            {documents.length === 0 ? (
              <Card className="col-span-3">
                <CardContent className="p-8 text-center">
                  <FileSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Documents</h3>
                  <p className="text-sm text-muted-foreground">Scan documents to see them here.</p>
                </CardContent>
              </Card>
            ) : (
              documents.map(doc => {
                const typeConfig = DOC_TYPE_CONFIG[doc.document_type] || DOC_TYPE_CONFIG.form;
                const Icon = typeConfig.icon;
                
                return (
                  <Card 
                    key={doc.id}
                    className="cursor-pointer hover:border-primary/50 transition-all"
                    onClick={() => setSelectedDoc(doc)}
                    data-testid={`document-${doc.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className={`p-2 rounded-lg bg-muted`}>
                          <Icon className={`w-5 h-5 ${typeConfig.color}`} />
                        </div>
                        <Badge variant="outline" className="capitalize">
                          {doc.document_type}
                        </Badge>
                      </div>
                      <h4 className="font-semibold text-sm mb-1">
                        {doc.extracted_fields?.vendor_name || 
                         doc.extracted_fields?.merchant_name || 
                         doc.extracted_fields?.contract_title ||
                         `${doc.document_type} Document`}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Confidence: {(doc.confidence_score * 100).toFixed(0)}%</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Document Detail Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        {selectedDoc && (
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="capitalize">{selectedDoc.document_type} Details</DialogTitle>
              <DialogDescription>Document ID: {selectedDoc.id}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Badge className="capitalize">{selectedDoc.document_type}</Badge>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Confidence:</span>
                  <Progress value={selectedDoc.confidence_score * 100} className="w-24 h-2" />
                  <span className="text-sm font-medium">{(selectedDoc.confidence_score * 100).toFixed(0)}%</span>
                </div>
              </div>
              
              <Separator />
              
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {Object.entries(selectedDoc.extracted_fields || {}).map(([key, value]) => (
                    <div key={key} className="p-3 bg-muted/50 rounded">
                      <Label className="text-xs text-muted-foreground capitalize">
                        {key.replace(/_/g, ' ')}
                      </Label>
                      <p className="text-sm font-medium whitespace-pre-wrap">
                        {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              {selectedDoc.validation && (
                <div className={`p-3 rounded ${selectedDoc.validation.is_valid ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedDoc.validation.is_valid ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="font-semibold">
                      {selectedDoc.validation.is_valid ? 'Validation Passed' : 'Issues Found'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedDoc.validation.validation_notes}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleValidate(selectedDoc.id)}>
                <Zap className="w-4 h-4 mr-2" />
                AI Validate
              </Button>
              <Button variant="outline" onClick={() => setSelectedDoc(null)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default DocumentScanner;
