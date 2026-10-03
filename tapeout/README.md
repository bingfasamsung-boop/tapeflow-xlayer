# TapeFlow Policy Gate V1

`TapeFlowPolicyGateV1.blif` is the X Layer TapeOut circuit used by
`TapeFlowCircuitBudgetPolicyV1`.

Input bits use TapeOut's little-endian packing:

0. payment policy is not frozen;
1. amount is within the payer's single-payment limit;
2. amount is within the payer's daily limit;
3. recipient passes the payer's optional allowlist;
4. payer and recipient addresses are valid.

Output bit 0 is `allow`. Every input must be true.

Import the BLIF file in the official TapeOut canvas, select X Layer, select the
TapeFlow X processor project, confirm the self-check and NAND count, then flow
the circuit. Record both the processor contract and new circuit ID. Deploy the
policy contract only after those two values are known.
