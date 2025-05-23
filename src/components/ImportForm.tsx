
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ImportFormValues, CSVRow, ImportResult, ImportProgress } from "../types";
import { 
  parseCSV, 
  validateCSV, 
  importArticlesToInstapaper 
} from "../services/instapaperService";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import FileUpload from "./FileUpload";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

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
      
      // Validate the CSV structure
      const validationResult = validateCSV(parsedRows);
      if (!validationResult.valid) {
        toast({
          title: "Invalid CSV File",
          description: validationResult.message,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Initialize progress tracking
      setImportProgress({
        current: 0,
        total: parsedRows.length,
        percentage: 0,
        isComplete: false
      });
      
      // Import articles to Instapaper with progress tracking
      const result = await importArticlesToInstapaper(
        { username: data.username, password: data.password },
        parsedRows,
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instapaper Email</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="youremail@example.com" 
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Your Instapaper password" 
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="csvFile"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CSV File</FormLabel>
                  <FormControl>
                    <FileUpload
                      onFileChange={(file) => field.onChange(file)}
                      accept=".csv"
                      error={form.formState.errors.csvFile?.message as string}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
              size="lg"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin"></span>
                  Importing...
                </span>
              ) : (
                "Import to Instapaper"
              )}
            </Button>
          </form>
        </Form>

        {importProgress && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Importing articles...</span>
              <span>{importProgress.current}/{importProgress.total} articles</span>
            </div>
            <Progress value={importProgress.percentage} className="h-2" />
          </div>
        )}
      </CardContent>
      
      {importResult && (
        <CardFooter>
          <div className={`w-full p-3 rounded-md text-sm ${
            importResult.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}>
            <p>{importResult.message}</p>
            {importResult.success && importResult.importedCount && (
              <p className="mt-1">Successfully imported {importResult.importedCount} articles.</p>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
};

export default ImportForm;
