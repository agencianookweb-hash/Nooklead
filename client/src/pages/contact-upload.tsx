import { useState, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  ArrowLeft,
  Download,
  Users,
  AlertTriangle,
  Info,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Types
interface UploadResult {
  message: string;
  validation: {
    id: string;
    filename: string;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    duplicateRecords: number;
    blacklistedRecords: number;
    status: string;
  };
}

interface FilePreview {
  name: string;
  size: number;
  type: string;
  formattedSize: string;
}

export default function ContactUpload() {
  const [, params] = useRoute("/campaigns/upload/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<FilePreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  const campaignId = params?.id;

  // File validation
  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ];
    
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return {
        valid: false,
        error: 'Tipo de arquivo não suportado. Use apenas CSV, XLSX ou TXT.'
      };
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return {
        valid: false,
        error: 'Arquivo muito grande. O tamanho máximo é 10MB.'
      };
    }
    
    return { valid: true };
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (file: File) => {
    const validation = validateFile(file);
    
    if (!validation.valid) {
      toast({
        title: "Arquivo inválido",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setFilePreview({
      name: file.name,
      size: file.size,
      type: file.type,
      formattedSize: formatFileSize(file.size)
    });
    setUploadResult(null);
    setUploadError(null);
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, []);

  // File input change handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadProgress(10);
      
      const response = await fetch(`/api/mass-campaigns/${campaignId}/upload-contacts`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      setUploadProgress(90);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao fazer upload do arquivo');
      }
      
      setUploadProgress(100);
      return response.json();
    },
    onSuccess: (data: UploadResult) => {
      setUploadResult(data);
      toast({
        title: "Upload concluído",
        description: "Arquivo processado com sucesso!",
      });
    },
    onError: (error: Error) => {
      setUploadError(error.message);
      setUploadProgress(0);
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!selectedFile) return;
    
    setUploadProgress(5);
    setUploadError(null);
    uploadMutation.mutate(selectedFile);
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    setUploadResult(null);
    setUploadError(null);
    setUploadProgress(0);
  };

  const handleBackToCampaign = () => {
    setLocation(`/campaigns/monitor/${campaignId}`);
  };

  const getFileTypeIcon = () => {
    if (!filePreview) return <FileText className="h-8 w-8" />;
    
    if (filePreview.name.endsWith('.csv')) {
      return <FileText className="h-8 w-8 text-green-600" />;
    } else if (filePreview.name.endsWith('.xlsx') || filePreview.name.endsWith('.xls')) {
      return <FileText className="h-8 w-8 text-blue-600" />;
    } else if (filePreview.name.endsWith('.txt')) {
      return <FileText className="h-8 w-8 text-gray-600" />;
    }
    
    return <FileText className="h-8 w-8" />;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Upload de Contatos
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-page-description">
            Adicione contatos à sua campanha através de arquivos CSV, XLSX ou TXT
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleBackToCampaign}
          data-testid="button-back-campaign"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Campanha
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="space-y-6">
          {/* File Upload Area */}
          <Card data-testid="card-file-upload">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Selecionar Arquivo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedFile ? (
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    dragActive
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  data-testid="drag-drop-area"
                >
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    Arraste e solte seu arquivo aqui
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    ou clique no botão abaixo para selecionar
                  </p>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                    data-testid="input-file"
                  />
                  <label htmlFor="file-input">
                    <Button asChild data-testid="button-select-file">
                      <span>Selecionar Arquivo</span>
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="border rounded-lg p-4" data-testid="file-preview">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getFileTypeIcon()}
                      <div>
                        <h4 className="font-medium" data-testid="text-file-name">
                          {filePreview?.name}
                        </h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-file-size">
                          {filePreview?.formattedSize}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearFile}
                      data-testid="button-clear-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <Card data-testid="card-upload-progress">
              <CardHeader>
                <CardTitle>Processando arquivo...</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={uploadProgress} className="w-full" data-testid="progress-upload" />
                <p className="text-sm text-muted-foreground mt-2">
                  {uploadProgress < 50 ? 'Enviando arquivo...' : 'Processando contatos...'}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Upload Error */}
          {uploadError && (
            <Alert variant="destructive" data-testid="alert-upload-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro no Upload</AlertTitle>
              <AlertDescription>{uploadError}</AlertDescription>
            </Alert>
          )}

          {/* Upload Button */}
          {selectedFile && !uploadMutation.isPending && !uploadResult && (
            <Button
              onClick={handleUpload}
              className="w-full"
              size="lg"
              data-testid="button-upload"
            >
              <Upload className="h-4 w-4 mr-2" />
              Fazer Upload
            </Button>
          )}
        </div>

        {/* Instructions and Results */}
        <div className="space-y-6">
          {/* Instructions */}
          {!uploadResult && (
            <Card data-testid="card-instructions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Instruções
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Formatos Aceitos:</h4>
                  <div className="flex gap-2">
                    <Badge variant="secondary">.CSV</Badge>
                    <Badge variant="secondary">.XLSX</Badge>
                    <Badge variant="secondary">.TXT</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Formato do Arquivo:</h4>
                  <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                    <div>Nome, Telefone, Email, Empresa</div>
                    <div className="text-muted-foreground">
                      João Silva, 11999999999, joao@empresa.com, Empresa ABC
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Limites:</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Máximo: 50.000 registros</li>
                    <li>• Tamanho: até 10MB</li>
                    <li>• Telefones brasileiros (10-11 dígitos)</li>
                  </ul>
                </div>

                <Alert data-testid="alert-validation-info">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Os contatos serão validados automaticamente e números inválidos ou na blacklist serão removidos.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <Card data-testid="card-upload-results">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Resultados do Processamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center" data-testid="result-total">
                    <div className="text-2xl font-bold">
                      {uploadResult.validation.totalRecords}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Processados</div>
                  </div>
                  <div className="text-center" data-testid="result-valid">
                    <div className="text-2xl font-bold text-green-600">
                      {uploadResult.validation.validRecords}
                    </div>
                    <div className="text-sm text-muted-foreground">Válidos</div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-center" data-testid="result-invalid">
                    <span className="text-sm">Números Inválidos:</span>
                    <Badge variant="outline" className="text-red-600">
                      {uploadResult.validation.invalidRecords}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center" data-testid="result-duplicates">
                    <span className="text-sm">Duplicados:</span>
                    <Badge variant="outline" className="text-yellow-600">
                      {uploadResult.validation.duplicateRecords}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center" data-testid="result-blacklisted">
                    <span className="text-sm">Blacklist:</span>
                    <Badge variant="outline" className="text-purple-600">
                      {uploadResult.validation.blacklistedRecords}
                    </Badge>
                  </div>
                </div>

                <Alert data-testid="alert-success">
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    {uploadResult.validation.validRecords} contatos foram adicionados à sua campanha com sucesso!
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button
                    onClick={handleBackToCampaign}
                    className="flex-1"
                    data-testid="button-back-to-campaign"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Campanha
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleClearFile}
                    data-testid="button-upload-another"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Novo Upload
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}