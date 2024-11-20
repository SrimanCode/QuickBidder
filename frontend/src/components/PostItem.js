import React, { useState } from "react";
import { Box, TextField, Button, Typography, Grid } from "@mui/material";
import { DatePicker } from "../components/ui/date-picker";
import { useAuth0 } from "@auth0/auth0-react";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Card, CardHeader, CardContent } from "../components/ui/card";
import Socket from "../components/socket";
import { set } from "date-fns";

const PostBid = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [alertMessage, setAlertMessage] = useState("");
  const { user } = useAuth0();
  const [alertVisible, setAlertVisible] = useState(false);

  const [formData, setFormData] = useState({
    itemName: "",
    price: "",
    description: "",
    bid_start_time: startDate,
    bid_end_time: endDate,
    image: null,
  });
  const formatDateTime = (date) => {
    const d = new Date(date);
    const pad = (num) => (num < 10 ? `0${num}` : num);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = (e) => {
    setFormData({ ...formData, image: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (startDate >= endDate) {
      setAlertVisible(true);
      setAlertMessage("Bidding end time must be after bidding start time.");
      return;
    }
    if (startDate < Date.now() || endDate < Date.now()) {
      setAlertVisible(true);
      setAlertMessage("Bidding start and end time is invalid.");
      return;
    }
    setAlertVisible(false);
    try {
      const response = await fetch("http://localhost:8080/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemName: formData.itemName,
          price: formData.price,
          description: formData.description,
          bid_start_time: formatDateTime(startDate),
          bid_end_time: formatDateTime(endDate),
          auth0_id: user.sub,
        }),
      });

      if (response.ok) {
        // Reset form data
        setFormData({
          itemName: "",
          price: "",
          description: "",
          image: null,
          bid_start_time: new Date(),
          bid_end_time: new Date(),
        });
        alert("Item posted successfully");
        // Show success toast
      } else {
        alert("Failed to post your item. Please try again later.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: "0 auto", p: 2 }}>
      <Card>
        <CardHeader>
          <Typography variant="h4" component="h1" gutterBottom>
            Post an Item for Bidding
          </Typography>
        </CardHeader>
        <CardContent>
          {alertVisible && (
            <Grid className="pb-4">
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{alertMessage}</AlertDescription>
              </Alert>
            </Grid>
          )}

          <form onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Item Name"
                  name="itemName"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Price ($)"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Short Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Set Bidding Start Time
                </Typography>
                <DatePicker onDateChange={setStartDate}></DatePicker>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Set Bidding End Time
                </Typography>
                <DatePicker onDateChange={setEndDate}></DatePicker>
              </Grid>

              <Grid item xs={12}>
                <Button variant="contained" component="label">
                  Upload Image
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </Button>
                {formData.image && (
                  <Typography sx={{ mt: 1 }}>
                    Selected File: {formData.image.name}
                  </Typography>
                )}
              </Grid>

              <Grid item xs={12}>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Submit
                </Button>
              </Grid>
            </Grid>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default PostBid;
