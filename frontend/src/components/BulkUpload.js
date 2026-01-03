import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, FileSpreadsheet, FileJson, File, Download, 
  CheckCircle2, XCircle, AlertTriangle, Loader2, 
  Table, FileText, Users, FileCheck, BarChart3, Trash2
} from 'lucide-react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Entity type configurations
const ENTITY_CONFIG = {
  playbooks: {
    label: 'Playbooks',
    icon: FileText,
    color: 'bg-blue-500',
    description: 'Business playbooks with tier and function assignments'
  },
  sops: {
    label: 'SOPs',
    icon: FileSpreadsheet,
    color: 'bg-green-500',
    description: 'Standard Operating Procedures linked to playbooks'
  },
  talents: {
    label: 'Talents',
    icon: Users,
    color: 'bg-purple-500',
    description: 'Team members with competency scores'
  },
  contracts: {
    label: 'Contracts',
    icon: FileCheck,
    color: 'bg-orange-500',
    description: 'Client contracts linked to talents'
  },
  kpis: {
    label: 'KPIs',
    icon: BarChart3,
    color: 'bg-yellow-500',
    description: 'Key Performance Indicators with thresholds'
  }
};

const BulkUploadDialog = ({ isOpen, onClose, onSuccess, defaultEntityType = null }) => {
  const [step, setStep] = useState(1); // 1: Select entity, 2: Upload, 3: Preview, 4: Result
  const [entityType, setEntityType] = useState(defaultEntityType || '');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const resetState = () => {
    setStep(defaultEntityType ? 2 : 1);
    setEntityType(defaultEntityType || '');
    setSelectedFile(null);
    setPreviewData(null);
    setImportResult(null);
    setError(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const validExtensions = ['.csv', '.json', '.xlsx', '.xls'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        setError('Invalid file format. Please use CSV, JSON, or Excel (.xlsx)');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      const validExtensions = ['.csv', '.json', '.xlsx', '.xls'];
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      
      if (!validExtensions.includes(ext)) {
        setError('Invalid file format. Please use CSV, JSON, or Excel (.xlsx)');
        return;
      }
      
      setSelectedFile(file);
      setError(null);
    }
  }, []);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const downloadTemplate = async (format) => {
    try {
      const response = await axios.get(`${API}/bulk/template/${entityType}?format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${entityType}_template.${format}`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handlePreview = async () => {
    if (!selectedFile || !entityType) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post(`${API}/bulk/preview/${entityType}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setPreviewData(response.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to preview file');
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !entityType) return;
    
    setUploading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      const response = await axios.post(`${API}/bulk/import/${entityType}?skip_invalid=true`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setImportResult(response.data);
      setStep(4);
      
      if (response.data.successful > 0) {
        onSuccess?.();
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to import data');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="w-8 h-8 text-gray-400" />;
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext === 'json') return <FileJson className="w-8 h-8 text-blue-500" />;
    if (ext === 'csv') return <Table className="w-8 h-8 text-green-500" />;
    return <FileSpreadsheet className="w-8 h-8 text-purple-500" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Bulk Upload
            {entityType && (
              <Badge className={ENTITY_CONFIG[entityType]?.color}>
                {ENTITY_CONFIG[entityType]?.label}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Select the type of data you want to upload"}
            {step === 2 && "Upload your file (CSV, JSON, or Excel)"}
            {step === 3 && "Review the data before importing"}
            {step === 4 && "Import complete"}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[1, 2, 3, 4].map((s) => (
            <React.Fragment key={s}>
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
              `}>
                {s}
              </div>
              {s < 4 && <div className={`flex-1 h-1 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-auto">
          {/* Step 1: Select Entity Type */}
          {step === 1 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(ENTITY_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <Card 
                    key={key}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      entityType === key ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setEntityType(key)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 mx-auto rounded-lg ${config.color} flex items-center justify-center mb-3`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className="font-semibold">{config.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Step 2: File Upload */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Download Templates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Download Template</CardTitle>
                  <CardDescription>
                    Download a template with sample data to see the expected format
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => downloadTemplate('csv')}>
                      <Download className="w-4 h-4 mr-2" /> CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadTemplate('json')}>
                      <Download className="w-4 h-4 mr-2" /> JSON
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadTemplate('xlsx')}>
                      <Download className="w-4 h-4 mr-2" /> Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* File Drop Zone */}
              <div
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center transition-colors
                  ${selectedFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'}
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="flex flex-col items-center gap-3">
                  {getFileIcon()}
                  
                  {selectedFile ? (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedFile.name}</span>
                      <Badge variant="outline">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        Drag and drop your file here, or click to browse
                      </p>
                      <p className="text-xs text-gray-400">
                        Supports CSV, JSON, Excel (.xlsx)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 3 && previewData && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">{previewData.total_rows}</div>
                    <div className="text-sm text-muted-foreground">Total Rows</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{previewData.valid_rows}</div>
                    <div className="text-sm text-green-600">Valid</div>
                  </CardContent>
                </Card>
                <Card className="border-red-200">
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{previewData.invalid_rows}</div>
                    <div className="text-sm text-red-600">Invalid</div>
                  </CardContent>
                </Card>
              </div>

              {/* Preview Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left w-16">Row</th>
                      <th className="px-3 py-2 text-left w-16">Status</th>
                      {previewData.columns.slice(0, 5).map((col) => (
                        <th key={col} className="px-3 py-2 text-left">{col}</th>
                      ))}
                      {previewData.columns.length > 5 && (
                        <th className="px-3 py-2 text-left">...</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.preview_data.map((row) => (
                      <tr 
                        key={row.row_number} 
                        className={`border-b ${row.is_valid ? '' : 'bg-red-50'}`}
                      >
                        <td className="px-3 py-2">{row.row_number}</td>
                        <td className="px-3 py-2">
                          {row.is_valid ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </td>
                        {previewData.columns.slice(0, 5).map((col) => (
                          <td key={col} className="px-3 py-2 max-w-[150px] truncate">
                            {String(row.data[col] ?? '')}
                          </td>
                        ))}
                        {previewData.columns.length > 5 && (
                          <td className="px-3 py-2 text-muted-foreground">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>

              {/* Validation Errors */}
              {previewData.invalid_rows > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Validation Errors</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-[100px] mt-2">
                      {previewData.preview_data
                        .filter(row => !row.is_valid)
                        .map((row) => (
                          <div key={row.row_number} className="text-sm mb-1">
                            <strong>Row {row.row_number}:</strong>{' '}
                            {row.errors.map(e => `${e.field}: ${e.error}`).join(', ')}
                          </div>
                        ))}
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && importResult && (
            <div className="space-y-4 text-center">
              <div className={`
                w-20 h-20 mx-auto rounded-full flex items-center justify-center
                ${importResult.successful > 0 ? 'bg-green-100' : 'bg-red-100'}
              `}>
                {importResult.successful > 0 ? (
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                ) : (
                  <XCircle className="w-10 h-10 text-red-600" />
                )}
              </div>

              <div>
                <h3 className="text-xl font-semibold">
                  {importResult.successful > 0 ? 'Import Successful!' : 'Import Failed'}
                </h3>
                <p className="text-muted-foreground mt-1">
                  {importResult.successful} of {importResult.total_processed} records imported
                </p>
              </div>

              <div className="flex justify-center gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">{importResult.successful}</div>
                    <div className="text-sm text-muted-foreground">Successful</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </CardContent>
                </Card>
              </div>

              {importResult.errors.length > 0 && (
                <Alert variant="destructive" className="text-left">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Import Errors</AlertTitle>
                  <AlertDescription>
                    <ScrollArea className="h-[100px] mt-2">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="text-sm mb-1">
                          <strong>Row {err.row}:</strong>{' '}
                          {err.error || err.errors?.map(e => `${e.field}: ${e.error}`).join(', ')}
                        </div>
                      ))}
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="mt-4">
          {step === 1 && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => setStep(2)} disabled={!entityType}>
                Next
              </Button>
            </>
          )}
          
          {step === 2 && (
            <>
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handlePreview} disabled={!selectedFile || uploading}>
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Preview
              </Button>
            </>
          )}
          
          {step === 3 && (
            <>
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button 
                onClick={handleImport} 
                disabled={uploading || previewData?.valid_rows === 0}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Import {previewData?.valid_rows} Valid Rows
              </Button>
            </>
          )}
          
          {step === 4 && (
            <Button onClick={handleClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Quick upload button component for inline use
export const BulkUploadButton = ({ entityType, onSuccess, variant = "outline", size = "default", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const config = ENTITY_CONFIG[entityType];

  return (
    <>
      <Button 
        variant={variant} 
        size={size}
        className={className}
        onClick={() => setIsOpen(true)}
      >
        <Upload className="w-4 h-4 mr-2" />
        Bulk Upload
      </Button>
      
      <BulkUploadDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSuccess={onSuccess}
        defaultEntityType={entityType}
      />
    </>
  );
};

export default BulkUploadDialog;
