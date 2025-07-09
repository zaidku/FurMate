import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SalonSettings {
  id?: string;
  salon_name?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
}

const SalonSettingsManager = () => {
  const [settings, setSettings] = useState<SalonSettings>({
    salon_name: "",
    logo_url: "",
    phone: "",
    email: "",
    address: "",
    website: ""
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSalonSettings();
  }, []);

  const fetchSalonSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('salon_settings')
        .select('*')
        .eq('salon_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching salon settings:', error);
      toast({
        title: "Error",
        description: "Failed to load salon settings",
        variant: "destructive"
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('salon-logos')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('salon-logos')
        .getPublicUrl(fileName);

      setSettings(prev => ({ ...prev, logo_url: data.publicUrl }));

      toast({
        title: "Success",
        description: "Logo uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from('salon_settings')
        .upsert({
          salon_id: user.id,
          salon_name: settings.salon_name,
          logo_url: settings.logo_url,
          phone: settings.phone,
          email: settings.email,
          address: settings.address,
          website: settings.website
        }, {
          onConflict: 'salon_id'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Salon settings saved successfully"
      });

      fetchSalonSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Salon Settings</h2>
        <p className="text-muted-foreground">Manage your salon information and branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Salon Information
          </CardTitle>
          <CardDescription>
            Update your salon details and logo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Logo Section */}
          <div className="space-y-4">
            <Label>Salon Logo</Label>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={settings.logo_url || ""} alt="Salon Logo" />
                <AvatarFallback>
                  <Building2 className="h-8 w-8" />
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="logo-upload" className="cursor-pointer">
                  <Button variant="outline" disabled={uploading} asChild>
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Logo"}
                    </span>
                  </Button>
                </Label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Recommended: Square image, PNG or JPG
                </p>
              </div>
            </div>
          </div>

          {/* Salon Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="salon_name">Salon Name</Label>
              <Input
                id="salon_name"
                value={settings.salon_name || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, salon_name: e.target.value }))}
                placeholder="Your Salon Name"
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={settings.phone || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, email: e.target.value }))}
                placeholder="salon@example.com"
              />
            </div>
            
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={settings.website || ""}
                onChange={(e) => setSettings(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={settings.address || ""}
              onChange={(e) => setSettings(prev => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main St, City, State 12345"
            />
          </div>

          <Button onClick={handleSave} disabled={loading} className="w-full">
            <Save className="h-4 w-4 mr-2" />
            {loading ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalonSettingsManager;