import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ImportFormValues, ImportResult, ImportProgress, CSVRow } from "@/types";
import { 
  parseCSV, 
  validateCSV, 
  importArticlesToInstapaper, 
  parseURLsFromCSV, 
  importURLsToInstapaper 
} from "@/services/instapaperService";
import { Form } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImportFormFields from "./ImportFormFields";
import ProgressIndicator from "./ProgressIndicator";
import ResultDisplay from "./ResultDisplay";
import axios from "axios";

const formSchema = z.object({
  username: z.string().email("Please enter a valid email address").min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  csvFile: z.any().refine((file) => file !== null, "Please select a CSV file"),
});

const ImportForm: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);

  const form = useForm<ImportFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
      csvFile: null,
    },
  });

  const handleProgressUpdate = (progress: ImportProgress) => {
    setImportProgress(progress);
  };

  const onSubmit = async (data: ImportFormValues) => {
    setIsSubmitting(true);
    setImportResult(null);
    setImportProgress(null);
    
    try {
      const file = data.csvFile;
      if (!file) {
        toast({
          title: "Error",
          description: "Please select a CSV file",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Read and parse the CSV file
      const fileContent = await file.text();
      const parsedRows = parseCSV(fileContent);
      // Only keep url and status fields
      const filteredRows = parsedRows
        .filter(row => row.url)
        .map(row => ({ url: row.url, status: row.status }));
      if (filteredRows.length === 0) {
        toast({
          title: "No URLs found",
          description: "No valid URLs were found in the CSV file.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      setImportProgress({
        current: 0,
        total: filteredRows.length,
        percentage: 0,
        isComplete: false
      });

      // Use the old import logic
      const result = await importArticlesToInstapaper(
        { username: data.username, password: data.password },
        // Pass only url and status fields, but importArticlesToInstapaper expects CSVRow[]
        filteredRows.map(row => ({ url: row.url, status: row.status, title: '', time_added: '', tags: '' })),
        handleProgressUpdate
      );
      setImportResult(result);
      // Show toast notification based on result
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Import Failed",
          description: result.message,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error("Error during import:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setImportResult({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">
          Import to Instapaper
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <ImportFormFields form={form} isSubmitting={isSubmitting} />
          </form>
        </Form>

        <ProgressIndicator progress={importProgress} />
      </CardContent>
      
      <ResultDisplay result={importResult} />
    </Card>
  );
};

export default ImportForm;
