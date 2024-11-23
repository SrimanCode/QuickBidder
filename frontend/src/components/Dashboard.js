import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useAuth0 } from "@auth0/auth0-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogTrigger,
  AlertDialogFooter,
} from "../components/ui/alert-dialog";
import BidList from "./BidList";
import BidForm from "./BidForm";
import ActiveBids from "./activeBids";
// Initialize socket outside the component
const socket = io("http://localhost:8080", {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

function Dashboard() {
  const { isAuthenticated, user, getIdTokenClaims } = useAuth0();
  const [bids, setBids] = useState([]);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      const fetchBalance = async () => {
        const token = await getIdTokenClaims();
        const response = await fetch(
          `http://localhost:8080/api/balance?id=${user.sub}`,
          {
            headers: {
              Authorization: `Bearer ${token.__raw}`,
            },
            method: "GET",
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        setBalance(data);
        console.log("Balance fetched successfully:", data.amount);
      };

      fetchBalance();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    socket.on("updateBid", (newBid) => {
      setBids((prevBids) => [...prevBids, newBid]);
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
    });

    return () => {
      socket.off("updateBid");
      socket.off("connect");
      socket.off("connect_error");
    };
  }, []);

  const handleNewBid = (bid) => {
    socket.emit("newBid", bid);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Card for Balance */}
      <Card className="border shadow-sm bg-slate-50">
        <CardHeader>
          <CardTitle>Account Balance</CardTitle>
          <CardDescription>
            Check your account balance and place new bids.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-green-600">
            Balance: ${balance?.amount ?? "0.00"}
          </p>
        </CardContent>
      </Card>

      {/* Bid Form */}
      <Card className="bg-white border shadow-sm">
        <CardHeader>
          <CardTitle>All bids</CardTitle>
          <CardDescription>
            Fill out the form below to place a new bid.
          </CardDescription>
        </CardHeader>
        <ActiveBids />
      </Card>

      {/* Alert Dialog Example */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete Account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default Dashboard;
