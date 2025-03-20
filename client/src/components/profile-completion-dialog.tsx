import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@lib/queryClient";
import { useToast } from "@hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@components/ui/form";
import { Input } from "@components/ui/input";
import { Button } from "@components/ui/button";
import { Textarea } from "@components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Form validation schema
const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  age: z.coerce
    .number()
    .int()
    .min(13, "You must be at least 13 years old to use this service")
    .max(120, "Please enter a valid age"),
  gender: z.string().min(1, "Please select your gender"),
  bio: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileCompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ProfileCompletionDialog({
  open,
  onOpenChange,
  onSuccess,
}: ProfileCompletionDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const totalSteps = 4;

  // Initialize form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      age: undefined,
      gender: "",
      bio: "",
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      return apiRequest<any>({
        url: "/api/user/profile",
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile Completed",
        description: "Your profile has been successfully updated!",
        variant: "default",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  // Navigate to next step
  const goToNextStep = () => {
    if (step === 1 && !form.getValues().fullName) {
      form.setError("fullName", {
        type: "manual",
        message: "Please enter your full name",
      });
      return;
    }

    if (step === 2 && !form.getValues().age) {
      form.setError("age", {
        type: "manual",
        message: "Please enter your age",
      });
      return;
    }

    if (step === 3 && !form.getValues().gender) {
      form.setError("gender", {
        type: "manual",
        message: "Please select your gender",
      });
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      form.handleSubmit(onSubmit)();
    }
  };

  // Go back to previous step
  const goToPreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Tell us a bit about yourself to personalize your experience.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2">
            {[...Array(totalSteps)].map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx + 1 === step ? "bg-primary" : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your full name" {...field} />
                    </FormControl>
                    <FormDescription>
                      This is how you'll appear to others in the app.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 2 && (
              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter your age"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      You must be at least 13 years old to use this service.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 3 && (
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {step === 4 && (
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a bit about yourself..."
                        className="resize-none h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Share your interests and what you're looking for in this
                      app.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={goToPreviousStep}
                disabled={step === 1}
              >
                Back
              </Button>
              <Button
                type="button"
                onClick={goToNextStep}
                disabled={updateProfileMutation.isPending}
              >
                {step === totalSteps ? "Complete Profile" : "Next"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}