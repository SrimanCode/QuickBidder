import React from "react";

const BidList = ({ bids }) => {
  return (
    <div>
      <h2>Current Bids</h2>
      <ul>
        {bids.map((bid, index) => (
          <li key={index}>
            User {bid.userId} placed a bid of ${bid.amount} on Item {bid.itemId}
            .
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BidList;
