import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth0 } from "@auth0/auth0-react";

import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Divider,
} from "@mui/material";

const socket = io("http://localhost:8080");

const ActiveBids = () => {
  const [bids, setBids] = useState([]);
  const { user } = useAuth0();
  const [newBid, setNewBid] = useState({
    itemID: "",
    bidAmount: "",
    auth0_id: "",
  });

  useEffect(() => {
    // Fetch initial bids
    socket.on("activeBids", (activeBids) => {
      setBids(activeBids);
    });

    // Update bid dynamically when a new bid is placed
    socket.on("bidScoreUpdated", ({ itemID, bidAmount, auth0id }) => {
      setBids((prevBids) =>
        prevBids.map((bid) =>
          bid.itemID === itemID
            ? { ...bid, score: bidAmount, winnerID: auth0id } // Update score for matching bid
            : bid
        )
      );
    });

    // Clean up listeners on component unmount
    return () => {
      socket.off("activeBids");
      socket.off("bidScoreUpdated");
    };
  }, []);

  const handleBidSubmit = (e, bid) => {
    e.preventDefault();

    if (!newBid.bidAmount) {
      alert("Please enter a bid amount.");
      return;
    }
    console.log("newBid", newBid);
    // Emit the new bid to the server
    socket.emit("newBid", {
      itemID: bid.itemID,
      bidAmount: parseFloat(newBid.bidAmount),
      auth0id: newBid.auth0_id,
    });

    // Reset the bid input field
    setNewBid({ itemID: "", bidAmount: "" });
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 4,
        minHeight: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Active Bids
      </Typography>
      <Box sx={{ width: "100%", maxWidth: 1200 }}>
        {bids.length > 0 ? (
          (console.log(bids),
          (
            <Grid container spacing={3}>
              {bids.map((bid) => (
                <Grid item xs={12} sm={6} md={4} key={bid.itemID}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      transition: "transform 0.2s",
                      "&:hover": {
                        transform: "scale(1.02)",
                        boxShadow: 3,
                      },
                    }}
                  >
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {bid.itemName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {bid.description}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body1">
                        Starting Price: ${bid.starting_price}
                      </Typography>
                      <Typography variant="body1">
                        Bid End Time:{" "}
                        {new Date(bid.bid_end_time).toLocaleString()}
                      </Typography>
                      <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                        Current Price: ${bid.score}
                      </Typography>
                      <Typography variant="h6" color="secondary" sx={{ mt: 2 }}>
                        current_winner: ${bid.winnerID}
                      </Typography>

                      {bid.winnerID === user.sub ? (
                        <Typography>You are the winner.</Typography>
                      ) : (
                        <Typography>You are not the winner.</Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Box sx={{ width: "100%" }}>
                        <form
                          onSubmit={(e) => handleBidSubmit(e, bid)}
                          style={{ width: "100%" }}
                        >
                          <Grid container spacing={1} alignItems="center">
                            <Grid item xs={8}>
                              <TextField
                                label="Bid Amount"
                                variant="outlined"
                                type="number"
                                fullWidth
                                size="small"
                                value={
                                  newBid.itemID === bid.itemID
                                    ? newBid.bidAmount
                                    : ""
                                }
                                onChange={(e) =>
                                  setNewBid({
                                    itemID: bid.itemID,
                                    bidAmount: e.target.value,
                                    auth0_id: user.sub,
                                  })
                                }
                              />
                            </Grid>
                            <Grid item xs={4}>
                              <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                fullWidth
                                size="small"
                              >
                                Submit
                              </Button>
                            </Grid>
                          </Grid>
                        </form>
                      </Box>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ))
        ) : (
          <Typography variant="body1" color="text.secondary" align="center">
            No active bids at the moment.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default ActiveBids;
