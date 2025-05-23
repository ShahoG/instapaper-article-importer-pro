
import React from "react";
import { UseFormReturn } from "react-hook-form";
import { ImportFormValues } from "@/types";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import FileUpload from "../FileUpload";

interface ImportFormFieldsProps {
  form: UseFormReturn<ImportFormValues>;
  isSubmitting: boolean;
}

const ImportFormFields: React.FC<ImportFormFieldsProps> = ({ form, isSubmitting }) => {
  return (
    <div className="space-y-6">
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
    </div>
  );
};

export default ImportFormFields;
