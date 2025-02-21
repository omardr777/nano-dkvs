## Some notes about RAFT protocol

#### RAFT is trying to implement fully consensus systems

- consensus systems have 4 major features:
- **Validity**: if any process does a read/write then it it has been done by a valid process.
- **Agreement**: every correct process must agree on the same value.
- **Termination**: every process has a finite number of steps to execute before it terminates.
- **Integrity**: if all correct processes decide on the same value, then any process has the said value.

#### Terms to refer to the roles in the asymmetric distributed system

- **Leader**: the server that interacts with the client.
- **Follower**: the server that syncs with the leader and redirect any request to the leader, when the leader is down the followers systems start
  an election process to find a new leader.
- **Candidate**: at the time of the election, the candidate is the server that asks for votes from other
  systems to become the new leader, initially all the servers are candidates.

To maintain the statuses of the systems the RAFT algo decides time into small arbitrary intervals called **Term Number**.
