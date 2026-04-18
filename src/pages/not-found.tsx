import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md glass-panel text-center p-8">
        <CardContent className="pt-6">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Chamber Lost</h1>
          <p className="text-muted-foreground mb-6">The path you are searching for does not exist in the ancient texts.</p>
          <Link to="/hub" className="inline-flex items-center justify-center h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">
            Return to Hub
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
