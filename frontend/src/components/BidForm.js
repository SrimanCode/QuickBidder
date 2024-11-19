import React, { useState } from "react";
import { Button as ShadcnButton } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { TextField, Box } from "@mui/material";

const BidForm = ({ onNewBid }) => {
  const [userId, setUserId] = useState("");
  const [itemId, setItemId] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onNewBid({
      userId: parseInt(userId),
      itemId: parseInt(itemId),
      amount: parseFloat(amount),
    });
    setUserId("");
    setItemId("");
    setAmount("");
  };

  return (
    <Card className="max-w-md mx-auto shadow-md">
      <CardHeader>
        <CardTitle>Place a Bid</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* User ID Field */}
            <TextField
              label="User ID"
              type="number"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              variant="outlined"
              fullWidth
              required
            />

            {/* Item ID Field */}
            <TextField
              label="Item ID"
              type="number"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              variant="outlined"
              fullWidth
              required
            />

            {/* Bid Amount Field */}
            <TextField
              label="Bid Amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              variant="outlined"
              fullWidth
              required
            />

            {/* Submit Button */}
            <ShadcnButton type="submit" className="w-full">
              Place Bid
            </ShadcnButton>
          </Box>
        </form>
      </CardContent>
    </Card>
  );
};

export default BidForm;
