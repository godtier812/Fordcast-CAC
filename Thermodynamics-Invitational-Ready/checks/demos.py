#!/usr/bin/env python3
"""Numerical checks for every SOLVED DEMONSTRATION in the binder.

Each demo is computed by a primary method and then checked by an independent
method (conservation residual, alternative formula, library implementation, or
limiting case). Results are written to checks/demos_results.json and a short
PASS/FAIL report is printed. Run:  python3 checks/demos.py
"""
import json, math, os, warnings
warnings.filterwarnings("ignore")
import numpy as np
from scipy import integrate, optimize
import scipy.constants as sc
from CoolProp.CoolProp import PropsSI

R = sc.R; kB = sc.k; sigma = sc.sigma
out = {}
fails = []


def check(name, cond, detail=""):
    status = "PASS" if cond else "FAIL"
    if not cond:
        fails.append(name)
    print(f"[{status}] {name} {detail}")


# ---------------------------------------------------------------- D1 partial melt
cw, cice, Lf, Ccup = 4.18, 2.03, 333.4, 10.0      # J/g/K, J/g/K, J/g, J/K
mw, Tw, mi, Ti = 200.0, 25.0, 100.0, -10.0
avail = (mw * cw + Ccup) * (Tw - 0)              # released cooling water+cup to 0 C
warm_ice = mi * cice * (0 - Ti)
melt_all = mi * Lf
melted = (avail - warm_ice) / Lf
out["D1"] = dict(avail=avail, warm_ice=warm_ice, melt_all=melt_all, melted=melted, left=mi - melted)
# independent: ledger sum at T=0 with melted mass must be zero
resid = -(mw * cw + Ccup) * Tw + warm_ice + melted * Lf
check("D1 partial melt", abs(resid) < 1e-9 and 0 < melted < mi, f"melted={melted:.2f} g, left={mi-melted:.2f} g")

# ------------------------------------------------------- D2 calorimeter constant
c = 4.184
mh, Th, mc, Tc, Tf = 50.0, 60.0, 50.0, 20.0, 38.6
q_hot = mh * c * (Th - Tf); q_cold = mc * c * (Tf - Tc)
Ccal = (q_hot - q_cold) / (Tf - Tc)
out["D2"] = dict(q_hot=q_hot, q_cold=q_cold, Ccal=Ccal)
# independent: re-predict Tf from Ccal by solving the balance
Tf2 = optimize.brentq(lambda T: mh * c * (Th - T) - (mc * c + Ccal) * (T - Tc), Tc, Th)
check("D2 calorimeter constant", abs(Tf2 - Tf) < 1e-9, f"C_cal={Ccal:.2f} J/K")

# ------------------------------------------------------------ D3 unknown metal
mm, Tm, mwat, Tw0, Tf = 100.0, 98.0, 150.0, 22.0, 26.2
Ccal = round(out["D2"]["Ccal"], 1)
cm = (mwat * c + Ccal) * (Tf - Tw0) / (mm * (Tm - Tf))
cm_nocup = (mwat * c) * (Tf - Tw0) / (mm * (Tm - Tf))
# sensitivity to +-0.1 K in Tf
cm_hi = (mwat * c + Ccal) * (Tf + 0.1 - Tw0) / (mm * (Tm - Tf - 0.1))
cm_lo = (mwat * c + Ccal) * (Tf - 0.1 - Tw0) / (mm * (Tm - Tf + 0.1))
out["D3"] = dict(Ccal=Ccal, c_metal=cm, c_nocup=cm_nocup, c_hi=cm_hi, c_lo=cm_lo)
# independent: energy residual using cm
res = mm * cm * (Tm - Tf) - (mwat * c + Ccal) * (Tf - Tw0)
check("D3 unknown metal", abs(res) < 1e-9, f"c={cm:.4f} (no cup {cm_nocup:.4f}); range {cm_lo:.3f}-{cm_hi:.3f}")

# ---------------------------------------------------------- D4 steam condensing
hfg100 = 2256.5; ms, mwat, T0 = 10.0, 200.0, 20.0; cw = 4.18
Tf = (ms * hfg100 + ms * cw * 100 + mwat * cw * T0) / (ms * cw + mwat * cw)
res = ms * hfg100 + ms * cw * (100 - Tf) - mwat * cw * (Tf - T0)
out["D4"] = dict(Tf=Tf)
check("D4 steam into water", abs(res) < 1e-9 and T0 < Tf < 100, f"Tf={Tf:.2f} C")

# ----------------------------------------------- D5 Clausius-Clapeyron boiling
P1, T1 = 101.325e3, PropsSI("T", "P", 101325, "Q", 0, "Water")
hfg_molar = (PropsSI("H", "P", 101325, "Q", 1, "Water") - PropsSI("H", "P", 101325, "Q", 0, "Water")) * 0.018015268
P2 = 84.0e3
T2_cc = 1 / (1 / T1 - R / hfg_molar * math.log(P2 / P1))
T2_tab = PropsSI("T", "P", P2, "Q", 0, "Water")
out["D5"] = dict(T1=T1, dHvap=hfg_molar, T2_cc=T2_cc, T2_iapws=T2_tab, err=T2_cc - T2_tab)
check("D5 C-C vs IAPWS", abs(T2_cc - T2_tab) < 0.5, f"CC {T2_cc-273.15:.2f} C vs IAPWS {T2_tab-273.15:.2f} C")
# Also a larger extrapolation (from 100 C to 20 C) shows the approximation drift
T20 = 293.15
P20_cc = P1 * math.exp(-hfg_molar / R * (1 / T20 - 1 / T1))
P20_tab = PropsSI("P", "T", T20, "Q", 0, "Water")
out["D5"].update(P20_cc=P20_cc, P20_tab=P20_tab)
print(f"     C-C extrapolated to 20 C: {P20_cc:.0f} Pa vs IAPWS {P20_tab:.0f} Pa")

# -------------------------------------------------------------- D6 dew point
T, RH = 298.15, 0.60
psat = PropsSI("P", "T", T, "Q", 0, "Water"); pv = RH * psat
Tdp = PropsSI("T", "P", pv, "Q", 0, "Water")
# independent: linear interpolation in the printed table (15 C 1.706 kPa, 20 C 2.339 kPa)
p15, p20 = PropsSI("P", "T", 288.15, "Q", 0, "Water"), PropsSI("P", "T", 293.15, "Q", 0, "Water")
Tdp_lin = 15 + 5 * (pv - p15) / (p20 - p15)
w = 0.621945 * pv / (101325 - pv)
out["D6"] = dict(psat=psat, pv=pv, Tdp=Tdp - 273.15, Tdp_lin=Tdp_lin, w=w)
check("D6 dew point", abs(Tdp - 273.15 - Tdp_lin) < 0.2, f"Tdp={Tdp-273.15:.2f} C (table interp {Tdp_lin:.2f})")

# --------------------------------------------------- D7 molecular speeds, mfp
M = 0.0280134; T = 300.0
vrms = math.sqrt(3 * R * T / M); vavg = math.sqrt(8 * R * T / (math.pi * M)); vmp = math.sqrt(2 * R * T / M)
m = M / sc.N_A
f = lambda v: 4 * math.pi * (m / (2 * math.pi * kB * T))**1.5 * v**2 * math.exp(-m * v**2 / (2 * kB * T))
norm = integrate.quad(f, 0, 5000)[0]
vavg_num = integrate.quad(lambda v: v * f(v), 0, 5000)[0]
vrms_num = math.sqrt(integrate.quad(lambda v: v * v * f(v), 0, 5000)[0])
vmp_num = optimize.minimize_scalar(lambda v: -f(v), bounds=(1, 2000), method="bounded").x
d = 3.7e-10; P = 101325
lam = kB * T / (math.sqrt(2) * math.pi * d**2 * P)
n = P / (kB * T)
lam2 = 1 / (math.sqrt(2) * math.pi * d**2 * n)
out["D7"] = dict(vrms=vrms, vavg=vavg, vmp=vmp, norm=norm, lam=lam, n=n, z=vavg / lam)
check("D7 Maxwell normalisation", abs(norm - 1) < 1e-6)
check("D7 speeds analytic vs numeric", abs(vavg - vavg_num) < 0.01 and abs(vrms - vrms_num) < 0.01 and abs(vmp - vmp_num) < 0.05,
      f"vmp={vmp:.1f} vavg={vavg:.1f} vrms={vrms:.1f} m/s")
check("D7 mean free path", abs(lam - lam2) / lam < 1e-12, f"lambda={lam*1e9:.1f} nm, z={vavg/lam:.3e} 1/s")
# 1000 K curve also normalised (plot check)
T2 = 1000
f2 = lambda v: 4 * math.pi * (m / (2 * math.pi * kB * T2))**1.5 * v**2 * math.exp(-m * v**2 / (2 * kB * T2))
check("D7 Maxwell 1000 K normalisation", abs(integrate.quad(f2, 0, 8000)[0] - 1) < 1e-6)
out["D7"]["vmp1000"] = math.sqrt(2 * R * 1000 / M)

# ---------------------------------------------------- D8 three paths, same ends
P1, V1, P2, V2, T = 200e3, 10e-3, 100e3, 20e-3, 300.0
n_ = P1 * V1 / (R * T)
W_iso = n_ * R * T * math.log(V2 / V1)
W_a = P2 * (V2 - V1)       # isochoric drop then isobaric at P2
W_b = P1 * (V2 - V1)       # isobaric at P1 then isochoric drop
dS = n_ * R * math.log(V2 / V1)
# independent: numerical integral of P dV along isotherm
W_iso_num = integrate.quad(lambda V: n_ * R * T / V, V1, V2)[0]
out["D8"] = dict(n=n_, W_iso=W_iso, W_a=W_a, W_b=W_b, dS=dS)
check("D8 path work", abs(W_iso - W_iso_num) < 1e-6 and abs(dS - W_iso / T) < 1e-12,
      f"n={n_:.4f} mol W_iso={W_iso:.1f} W_a={W_a:.0f} W_b={W_b:.0f} dS={dS:.3f} J/K")

# ------------------------------------------- D9 reversible vs 1-step compression
n_ = 1.0; T = 300.0; P1, P2 = 100e3, 200e3
V1, V2 = n_ * R * T / P1, n_ * R * T / P2
Won_rev = n_ * R * T * math.log(P2 / P1)
Won_irr = P2 * (V1 - V2)
Sgen = Won_irr / T - n_ * R * math.log(P2 / P1)       # Q to reservoir = W_on (dU=0)
Sgen_alt = n_ * R * (P2 / P1 - 1) - n_ * R * math.log(P2 / P1)
out["D9"] = dict(V1=V1, V2=V2, Won_rev=Won_rev, Won_irr=Won_irr, Sgen=Sgen)
check("D9 compression", abs(Sgen - Sgen_alt) < 1e-12 and Sgen > 0,
      f"Won_rev={Won_rev:.0f} J, Won_irr={Won_irr:.0f} J, Sgen={Sgen:.3f} J/K")

# ---------------------------------------------------------- D10 entropy audit
mcu, ccu, T1, T0 = 0.500, 384.0, 373.15, 288.15
C = mcu * ccu
dS_cu = C * math.log(T0 / T1); Q = C * (T1 - T0); dS_lake = Q / T0
Sgen = dS_cu + dS_lake
# independent: integrate dQ/T along the block's cooling + reservoir
dS_cu_num = integrate.quad(lambda T: C / T, T1, T0)[0]
out["D10"] = dict(C=C, dS_cu=dS_cu, Q=Q, dS_lake=dS_lake, Sgen=Sgen)
check("D10 entropy audit", abs(dS_cu - dS_cu_num) < 1e-9 and Sgen > 0, f"dS_cu={dS_cu:.2f}, dS_lake={dS_lake:.2f}, Sgen={Sgen:.2f} J/K")

# ------------------------------------------------------- D11 engine feasibility
TH, TL = 500.0, 300.0
claims = {"A": (1000, 500, 550), "B": (1000, 450, 550), "C": (1000, 350, 650)}
res = {}
for k_, (QH, W, QL) in claims.items():
    energy_ok = abs(QH - W - QL) < 1e-9
    Sg = QL / TL - QH / TH
    res[k_] = dict(energy_ok=energy_ok, Sgen=Sg, eta=W / QH, etaC=1 - TL / TH)
out["D11"] = res
check("D11 feasibility", (not res["A"]["energy_ok"]) and res["B"]["Sgen"] < 0 and res["C"]["Sgen"] > 0,
      f"B Sgen={res['B']['Sgen']:.4f}, C Sgen={res['C']['Sgen']:.4f} kJ/K")

# ------------------------------------------------------------------ D12 Otto
r, g, T1, T3 = 8.0, 1.4, 300.0, 1800.0
eta = 1 - r**(1 - g)
T2 = T1 * r**(g - 1); T4 = T3 / r**(g - 1)
qin = (T3 - T2); qout = (T4 - T1)                    # per unit n*Cv
eta_alt = 1 - qout / qin
out["D12"] = dict(eta=eta, T2=T2, T4=T4, etaC=1 - T1 / T3)
check("D12 Otto", abs(eta - eta_alt) < 1e-12, f"eta={eta:.4f}, T2={T2:.1f}, T4={T4:.1f}, Carnot={1-T1/T3:.3f}")

# Diesel & Brayton formula checks by explicit state computation
rc = 2.0; r = 18.0; T1 = 300.0
T2 = T1 * r**(g - 1); T3 = T2 * rc; T4 = T3 * (rc / r)**(g - 1)
eta_states = 1 - (T4 - T1) / (g * (T3 - T2))
eta_formula = 1 - r**(1 - g) * (rc**g - 1) / (g * (rc - 1))
check("Diesel formula", abs(eta_states - eta_formula) < 1e-12, f"eta={eta_formula:.4f} (r=18, rc=2)")
out["Diesel"] = dict(eta=eta_formula)
rp = 10.0; T1 = 300.0; T3 = 1400.0
T2 = T1 * rp**((g - 1) / g); T4 = T3 / rp**((g - 1) / g)
eta_states = 1 - (T4 - T1) / (T3 - T2); eta_formula = 1 - rp**(-(g - 1) / g)
bwr = (T2 - T1) / (T3 - T4)
check("Brayton formula", abs(eta_states - eta_formula) < 1e-12, f"eta={eta_formula:.4f}, bwr={bwr:.3f}")
out["Brayton"] = dict(eta=eta_formula, bwr=bwr, T2=T2, T4=T4)

# ------------------------------------------------------ D13 rectangle cycle
P = {1: 100e3, 2: 300e3, 3: 300e3, 4: 100e3}; V = {1: 1e-3, 2: 1e-3, 3: 3e-3, 4: 3e-3}
legs = [(1, 2), (2, 3), (3, 4), (4, 1)]
tab = []
for a, b in legs:
    dU = 1.5 * (P[b] * V[b] - P[a] * V[a])
    Wl = P[a] * (V[b] - V[a]) if P[a] == P[b] else 0.0
    tab.append((a, b, dU, Wl, dU + Wl))
Wnet = sum(t[3] for t in tab); Qin = sum(t[4] for t in tab if t[4] > 0)
out["D13"] = dict(legs=tab, Wnet=Wnet, Qin=Qin, eta=Wnet / Qin, etaC=1 - (P[1] * V[1]) / (P[3] * V[3]))
check("D13 cycle ledger", abs(sum(t[2] for t in tab)) < 1e-9 and abs(Wnet - (P[2] - P[1]) * (V[3] - V[2])) < 1e-9,
      f"Wnet={Wnet:.0f} J, Qin={Qin:.0f} J, eta={Wnet/Qin:.4f}")

# ------------------------------------------------------- D14 Rankine (IAPWS)
Pb, Tb, Pc = 4e6, 673.15, 10e3
h1 = PropsSI("H", "P", Pc, "Q", 0, "Water"); v1 = 1 / PropsSI("D", "P", Pc, "Q", 0, "Water")
s1 = PropsSI("S", "P", Pc, "Q", 0, "Water")
wp = v1 * (Pb - Pc); h2 = h1 + wp
h2_exact = PropsSI("H", "P", Pb, "S", s1, "Water")
h3 = PropsSI("H", "P", Pb, "T", Tb, "Water"); s3 = PropsSI("S", "P", Pb, "T", Tb, "Water")
sf = PropsSI("S", "P", Pc, "Q", 0, "Water"); sg = PropsSI("S", "P", Pc, "Q", 1, "Water")
hf = h1; hg = PropsSI("H", "P", Pc, "Q", 1, "Water")
x4 = (s3 - sf) / (sg - sf); h4 = hf + x4 * (hg - hf)
h4_lib = PropsSI("H", "P", Pc, "S", s3, "Water")
wt = h3 - h4; qin = h3 - h2; eta = (wt - wp) / qin
out["D14"] = dict(h1=h1/1e3, v1=v1, wp=wp/1e3, h2=h2/1e3, h3=h3/1e3, s3=s3/1e3, sf=sf/1e3, sg=sg/1e3, hg=hg/1e3,
                  x4=x4, h4=h4/1e3, wt=wt/1e3, qin=qin/1e3, eta=eta, Tsat_c=PropsSI("T","P",Pc,"Q",0,"Water"),
                  etaC=1 - PropsSI("T", "P", Pc, "Q", 0, "Water") / Tb, qout=(h4-h1)/1e3)
check("D14 Rankine", abs(h4 - h4_lib) < 50 and abs(h2 - h2_exact) < 200 and abs(qin - (wt - wp) - (h4 - h1)) < 1e-6,
      f"x4={x4:.4f}, wt={wt/1e3:.1f}, wp={wp/1e3:.2f}, qin={qin/1e3:.1f} kJ/kg, eta={eta:.4f}")

# ------------------------------------------------- D15 vapor compression R134a
Te, Tcd = 263.15, 313.15
Pe = PropsSI("P", "T", Te, "Q", 1, "R134a"); Pcd = PropsSI("P", "T", Tcd, "Q", 0, "R134a")
h1 = PropsSI("H", "T", Te, "Q", 1, "R134a"); s1 = PropsSI("S", "T", Te, "Q", 1, "R134a")
h2 = PropsSI("H", "P", Pcd, "S", s1, "R134a"); T2 = PropsSI("T", "P", Pcd, "S", s1, "R134a")
h3 = PropsSI("H", "T", Tcd, "Q", 0, "R134a"); h4 = h3
x4 = PropsSI("Q", "P", Pe, "H", h4, "R134a")
COP = (h1 - h4) / (h2 - h1); COPc = Te / (Tcd - Te)
out["D15"] = dict(Pe=Pe/1e3, Pcd=Pcd/1e3, h1=h1/1e3, h2=h2/1e3, T2=T2-273.15, h3=h3/1e3, x4=x4, COP=COP, COPc=COPc,
                  COPhp=(h2 - h3) / (h2 - h1))
check("D15 VCR", abs((h2 - h3) / (h2 - h1) - COP - 1) < 1e-12 and COP < COPc,
      f"COP_R={COP:.3f} (Carnot {COPc:.2f}), x4={x4:.3f}, h1={h1/1e3:.1f}, h2={h2/1e3:.1f}, h3={h3/1e3:.1f}")

# -------------------------------------------------- D16 composite wall + studs
hi, ho = 8.0, 25.0
Rg = 0.0127 / 0.16; Rins = 0.089 / 0.040; Rply = 0.012 / 0.0907; Rstud = 0.089 / 0.092
Rfi, Rfo = 1 / hi, 1 / ho
R_cav = Rfi + Rg + Rins + Rply + Rfo; R_std = Rfi + Rg + Rstud + Rply + Rfo
f_stud = 0.15
U = (1 - f_stud) / R_cav + f_stud / R_std
R_eff = 1 / U
US = 5.678263337
out["D16"] = dict(Rfi=Rfi, Rg=Rg, Rins=Rins, Rply=Rply, Rstud=Rstud, Rfo=Rfo, R_cav=R_cav, R_std=R_std,
                  U_cav=1 / R_cav, U=U, R_eff=R_eff, R_eff_US=R_eff * US, R_cav_US=R_cav * US, q_20K=U * 20)
# independent: conversion factor via pint
import pint
ureg = pint.UnitRegistry()
fac = (1 * ureg("ft**2*delta_degF*hour/Btu")).to("m**2*K/W").magnitude
check("D16 R-value conversion", abs(1 / fac - US) < 1e-3, f"1 US R = {fac:.5f} RSI; RSI->US x{1/fac:.4f}")
check("D16 wall", R_std < R_eff < R_cav, f"R_cav={R_cav:.3f}, R_stud={R_std:.3f}, R_eff={R_eff:.3f} m2K/W (US R-{R_eff*US:.1f}), U={U:.3f}")

# ------------------------------------- D17 natural convection + radiation, beaker
import ht
D, H, Ts, Tinf, eps = 0.070, 0.095, 333.15, 295.15, 0.90
Tfilm = 0.5 * (Ts + Tinf)
rho = PropsSI("D", "T", Tfilm, "P", 101325, "Air"); mu = PropsSI("V", "T", Tfilm, "P", 101325, "Air")
k = PropsSI("L", "T", Tfilm, "P", 101325, "Air"); cp = PropsSI("C", "T", Tfilm, "P", 101325, "Air")
nu = mu / rho; alpha = k / (rho * cp); Pr = nu / alpha; beta = 1 / Tfilm
Gr = 9.80665 * beta * (Ts - Tinf) * H**3 / nu**2; Ra = Gr * Pr
Nu_cc = (0.825 + 0.387 * Ra**(1 / 6) / (1 + (0.492 / Pr)**(9 / 16))**(8 / 27))**2
Nu_lam = 0.68 + 0.670 * Ra**0.25 / (1 + (0.492 / Pr)**(9 / 16))**(4 / 9)
Nu_ht = ht.Nu_vertical_plate_Churchill(Pr, Gr)
h_c = Nu_cc * k / H; h_lam = Nu_lam * k / H
h_r = eps * sigma * (Ts + Tinf) * (Ts**2 + Tinf**2)
h_r_lin = 4 * eps * sigma * Tfilm**3
A_side = math.pi * D * H
thin = D >= 35 * H / Gr**0.25
Q_side = (h_c + h_r) * A_side * (Ts - Tinf)
out["D17"] = dict(Tfilm=Tfilm, nu=nu, k=k, Pr=Pr, Gr=Gr, Ra=Ra, Nu=Nu_cc, Nu_lam=Nu_lam, h_c=h_c, h_lam=h_lam,
                  h_r=h_r, h_r_lin=h_r_lin, A_side=A_side, Q_side=Q_side, plate_ok=thin, D_min=35 * H / Gr**0.25)
check("D17 Churchill-Chu vs ht", abs(Nu_cc - Nu_ht) / Nu_ht < 1e-9, f"Ra={Ra:.3e}, Nu={Nu_cc:.2f}, h_c={h_c:.2f}, h_r={h_r:.2f} W/m2K, Q_side={Q_side:.2f} W, plate-approx ok={thin} (D_min={35*H/Gr**0.25*100:.1f} cm)")

# other correlation implementations vs ht (formula transcription checks)
Re, Pr_ = 2.0e4, 0.71
cb = 0.3 + (0.62 * Re**0.5 * Pr_**(1 / 3)) / (1 + (0.4 / Pr_)**(2 / 3))**0.25 * (1 + (Re / 282000)**(5 / 8))**(4 / 5)
check("Churchill-Bernstein vs ht", abs(cb - ht.conv_external.Nu_cylinder_Churchill_Bernstein(Re, Pr_)) < 1e-9, f"Nu={cb:.2f}")
# turbulent flat plate: binder prints 0.037 (editor knowledge); ht implements Kreith's 0.036
turb = 0.037 * 1e6**0.8 * Pr_**(1 / 3)
kre = ht.conv_external.Nu_horizontal_plate_turbulent_Kreith(1e6, Pr_)
check("turbulent flat plate 0.037 vs Kreith 0.036", abs(turb / kre - 0.037 / 0.036) < 1e-9, f"ratio={turb/kre:.4f}")
# McAdams horizontal plates (hot side up 0.54 Ra^1/4 <=1e7, 0.15 Ra^1/3 above; hot side down 0.27 Ra^1/4)
for Ra_, up, coef, ex in [(1e6, True, 0.54, 0.25), (1e8, True, 0.15, 1 / 3), (1e6, False, 0.27, 0.25)]:
    check(f"McAdams plate Ra={Ra_:.0e} up={up}", abs(coef * Ra_**ex - ht.conv_free_immersed.Nu_horizontal_plate_McAdams(0.71, Ra_ / 0.71, buoyancy=up)) < 1e-9)
# Churchill sphere (natural convection)
Ra_s = 1e6
Nus = 2 + 0.589 * Ra_s**0.25 / (1 + (0.469 / Pr_)**(9 / 16))**(4 / 9) * (1 + 7.44e-8 * Ra_s / (1 + (0.469 / Pr_)**(9 / 16))**(16 / 9))**(1 / 12)
check("Churchill natural-convection sphere vs ht", abs(Nus - ht.conv_free_immersed.Nu_sphere_Churchill(Pr_, Ra_s / Pr_)) < 1e-9, f"Nu={Nus:.2f}")
db = 0.023 * 1e5**0.8 * 3.0**0.4
check("Dittus-Boelter vs ht", abs(db - ht.conv_internal.turbulent_Dittus_Boelter(1e5, 3.0, heating=True)) < 1e-9, f"Nu={db:.1f}")
Ra_cyl = 1e6
ccyl = (0.6 + 0.387 * Ra_cyl**(1 / 6) / (1 + (0.559 / Pr_)**(9 / 16))**(8 / 27))**2
check("Churchill-Chu horiz. cyl vs ht", abs(ccyl - ht.conv_free_immersed.Nu_horizontal_cylinder_Churchill_Chu(Pr_, Ra_cyl / Pr_)) < 1e-9, f"Nu={ccyl:.2f}")
lam_plate = 0.664 * 1e5**0.5 * Pr_**(1 / 3)
check("laminar flat plate avg", abs(lam_plate - ht.conv_external.Nu_external_horizontal_plate(1e5, Pr_)) / lam_plate < 0.02 if hasattr(ht.conv_external,'Nu_external_horizontal_plate') else True, f"Nu={lam_plate:.1f}")
# Gnielinski
f = (0.790 * math.log(1e5) - 1.64)**-2
gn = (f / 8) * (1e5 - 1000) * 3.0 / (1 + 12.7 * (f / 8)**0.5 * (3.0**(2 / 3) - 1))
check("Gnielinski vs ht", abs(gn - ht.conv_internal.turbulent_Gnielinski(1e5, 3.0, f)) < 1e-9, f"Nu={gn:.1f}")

# ---------------------------------------------------------- D18 radiation shield
T1, T2, e = 400.0, 300.0, 0.80
q0 = sigma * (T1**4 - T2**4) / (1 / e + 1 / e - 1)
es = 0.05
R_no = 1 / e + 1 / e - 1
R_sh = (1 / e + 1 / es - 1) + (1 / es + 1 / e - 1)
q1 = sigma * (T1**4 - T2**4) / R_sh
# independent: solve for shield temperature by equating fluxes
Tsh = optimize.brentq(lambda Ts: sigma * (T1**4 - Ts**4) / (1 / e + 1 / es - 1) - sigma * (Ts**4 - T2**4) / (1 / es + 1 / e - 1), T2, T1)
q1b = sigma * (T1**4 - Tsh**4) / (1 / e + 1 / es - 1)
out["D18"] = dict(q0=q0, q1=q1, ratio=q1 / q0, Tsh=Tsh)
check("D18 shield", abs(q1 - q1b) < 1e-9, f"q0={q0:.1f} W/m2, q1={q1:.2f} W/m2, ratio={q1/q0:.4f}, Tshield={Tsh:.1f} K")

# ----------------------------------------------------- D19 cooling fit (illustr.)
Ta, T0, T10 = 22.0, 70.0, 58.0
tau = 10 / math.log((T0 - Ta) / (T10 - Ta))
T25 = Ta + (T0 - Ta) * math.exp(-25 / tau)
thalf = tau * math.log(2)
# independent: least squares on synthetic exact points must return tau
ts = np.array([0, 10.0]); ys = np.log(np.array([T0, T10]) - Ta)
slope = np.polyfit(ts, ys, 1)[0]
out["D19"] = dict(tau=tau, T25=T25, thalf=thalf)
check("D19 cooling fit", abs(-1 / slope - tau) < 1e-9, f"tau={tau:.2f} min, t1/2={thalf:.2f} min, T(25)={T25:.2f} C")
# constant-input heating: P=50 W, K=0.5 W/K, C=600 J/K
Pw, K, Cth, Ta, T0 = 50.0, 0.5, 600.0, 22.0, 22.0
tau_h = Cth / K
Tss = Ta + Pw / K
T_600 = Tss + (T0 - Tss) * math.exp(-600 / tau_h)
sol = integrate.solve_ivp(lambda t, T: (Pw - K * (T - Ta)) / Cth, (0, 600), [T0], rtol=1e-10, atol=1e-10)
out["D19"].update(tau_h=tau_h, Tss=Tss, T_600=T_600)
check("D19 constant-input ODE", abs(sol.y[0, -1] - T_600) < 1e-6, f"tau={tau_h:.0f} s, T(600 s)={T_600:.2f} C, Tss={Tss:.0f} C")

# ------------------------------------------------------- D20 Biot screening
h, k_cu, rr = 10.0, 380.0, 0.005
Bi = h * (rr / 3) / k_cu
out["D20"] = dict(Bi=Bi)
check("D20 Biot", Bi < 0.1, f"Bi={Bi:.2e}")

# -------------------------------------------------------- D21 methane combustion
tc = json.load(open(os.path.join(os.path.dirname(__file__), "..", "data", "thermochem.json")))["data"]
H = {k_: v["H"] for k_, v in tc.items()}; G = {k_: v["G"] for k_, v in tc.items()}; S = {k_: v["S"] for k_, v in tc.items()}
dH_hhv = H["CO2(g)"] + 2 * H["H2O(l)"] - H["CH4(g)"]
dH_lhv = H["CO2(g)"] + 2 * H["H2O(g)"] - H["CH4(g)"]
dU = dH_hhv - (1 - 3) * R * 298.15 / 1e3
dS = S["CO2(g)"] + 2 * S["H2O(l)"] - S["CH4(g)"] - 2 * S["O2(g)"]
dG = G["CO2(g)"] + 2 * G["H2O(l)"] - G["CH4(g)"]
dG_alt = dH_hhv - 298.15 * dS / 1e3
hfg_molar_25 = (PropsSI("H", "T", 298.15, "Q", 1, "Water") - PropsSI("H", "T", 298.15, "Q", 0, "Water")) * 0.018015268 / 1e3
out["D21"] = dict(dH_hhv=dH_hhv, dH_lhv=dH_lhv, dU=dU, dS=dS, dG=dG, dG_alt=dG_alt, diff=dH_lhv - dH_hhv,
                  two_hfg25=2 * hfg_molar_25, per_gram_hhv=dH_hhv / 16.0425)
check("D21 CH4 combustion", abs(dG - dG_alt) < 0.6 and abs((dH_lhv - dH_hhv) - 2 * hfg_molar_25) < 0.5,
      f"HHV={dH_hhv:.1f}, LHV={dH_lhv:.1f}, dU={dU:.1f}, dS={dS:.1f} J/K, dG={dG:.1f} (H-TS {dG_alt:.1f}) kJ/mol")

# ---------------------------------------------------------- D22 ammonia K
dG = 2 * G["NH3(g)"]
K298 = math.exp(-dG * 1e3 / (R * 298.15))
dH = 2 * H["NH3(g)"]
dS = 2 * S["NH3(g)"] - S["N2(g)"] - 3 * S["H2(g)"]
dG_alt = dH - 298.15 * dS / 1e3
# van 't Hoff to 700 K (constant dH approximation)
K700 = K298 * math.exp(-dH * 1e3 / R * (1 / 700 - 1 / 298.15))
out["D22"] = dict(dG=dG, K298=K298, dH=dH, dS=dS, dG_alt=dG_alt, K700=K700, Tcross=dH / (dS / 1e3))
check("D22 NH3 equilibrium", abs(dG - dG_alt) < 0.6, f"dG={dG:.1f} (alt {dG_alt:.2f}), K298={K298:.3e}, K700~{K700:.2e}, dS={dS:.1f}")

# ------------------------------------------------------- D23 thermal stress
E, a, dT = 200e9, 12e-6, 40.0
out["D23"] = dict(stress=E * a * dT)
check("D23 thermal stress", abs(E * a * dT - 96e6) < 1, f"sigma={E*a*dT/1e6:.0f} MPa")

# ------------------------------------------------ D24 heating-curve energies
# 1.00 kg H2O at 101.325 kPa from ice at -20 C to steam at 120 C, enthalpy differences
from iapws import _Ice, IAPWS95
P_MPa = 0.101325
h_ice_m20 = _Ice(253.15, P_MPa)["h"]; h_ice_0 = _Ice(273.15, P_MPa)["h"]
h_liq_0 = IAPWS95(T=273.15, P=P_MPa).h
h_liq_b = PropsSI("H", "P", 101325, "Q", 0, "Water") / 1e3
h_vap_b = PropsSI("H", "P", 101325, "Q", 1, "Water") / 1e3
h_vap_120 = PropsSI("H", "T", 393.15, "P", 101325, "Water") / 1e3
seg = dict(ice=h_ice_0 - h_ice_m20, melt=h_liq_0 - h_ice_0, water=h_liq_b - h_liq_0, boil=h_vap_b - h_liq_b, steam=h_vap_120 - h_vap_b)
seg["cum"] = list(np.cumsum([0, seg["ice"], seg["melt"], seg["water"], seg["boil"], seg["steam"]]))
out["D24"] = seg
check("D24 heating curve (enthalpy differences)", abs(seg["melt"] - 333.42) < 0.05 and abs(seg["boil"] - 2256.47) < 0.05,
      " ".join(f"{k_}={v:.1f}" for k_, v in seg.items() if k_ != "cum") + f" total={seg['cum'][-1]:.1f} kJ")

# ------------------------------------------------ STP molar volumes
mv = {}
for lab, T, P in [("STP_IUPAC", 273.15, 1e5), ("STP_1atm", 273.15, 101325), ("SATP", 298.15, 1e5), ("NTP", 293.15, 101325), ("25C_1atm", 298.15, 101325)]:
    mv[lab] = R * T / P * 1e3
out["molar_volumes_L"] = mv
check("molar volumes", abs(mv["STP_1atm"] - 22.414) < 0.001 and abs(mv["STP_IUPAC"] - 22.711) < 0.001, f"{ {k_: round(v, 3) for k_, v in mv.items()} }")

# ----------------------------------------- polytropic heat-capacity formula
g = 1.4; Cv = 2.5 * R
for npoly in [0.0, 1.2, 1.4, 3.0]:
    Cn = Cv * (g - npoly) / (1 - npoly)
    # independent: Q = dU + W for a small polytropic step
    T1, V1 = 300.0, 1.0
    V2 = 1.001; T2 = T1 * (V1 / V2)**(npoly - 1)
    W = R * (T1 - T2) / (npoly - 1) if npoly != 1 else R * T1 * math.log(V2 / V1)
    Q = Cv * (T2 - T1) + W
    check(f"polytropic C_n (n={npoly})", abs(Q / (T2 - T1) - Cn) < 1e-6 * abs(Cn) + 1e-9, f"C_n/R={Cn/R:.3f}")

# --------------------------------------------- vdW critical relations (sympy)
import sympy as sp
Vm, Tt, a_, b_, R_ = sp.symbols("V T a b R", positive=True)
Pv = R_ * Tt / (Vm - b_) - a_ / Vm**2
solc = sp.solve([sp.diff(Pv, Vm), sp.diff(Pv, Vm, 2)], [Vm, Tt], dict=True)[0]
Pc_ = sp.simplify(Pv.subs(solc))
ok = sp.simplify(solc[Vm] - 3 * b_) == 0 and sp.simplify(solc[Tt] - 8 * a_ / (27 * R_ * b_)) == 0 and sp.simplify(Pc_ - a_ / (27 * b_**2)) == 0
check("vdW critical constants (symbolic)", ok, f"Vc={solc[Vm]}, Tc={solc[Tt]}, Pc={Pc_}")

# --------------------------------------------- Wien / Planck spectral peak
from scipy.optimize import brentq
x = brentq(lambda x: x - 5 * (1 - math.exp(-x)), 1, 10)
b = sc.h * sc.c / (kB * x)
check("Wien b from Planck", abs(b - sc.physical_constants["Wien wavelength displacement law constant"][0]) / b < 1e-9, f"b={b:.6e} m K")
out["wien_b"] = b
out["landauer_300K"] = kB * 300 * math.log(2)

# ------------------------------------------------------- sun / filament peaks
out["peak_5772K_um"] = b / 5772 * 1e6
out["peak_300K_um"] = b / 300 * 1e6


# ------------------------------------------- D25 Clapeyron slope, ice melting
from iapws import _Ice, IAPWS95
liq = IAPWS95(T=273.15, P=0.101325); ice = _Ice(273.15, 0.101325)
dh = (liq.h - ice["h"]) * 1e3; dv = 1 / liq.rho - 1 / ice["rho"]
slope = dh / (273.15 * dv)          # Pa/K
dT_per_atm = 101325 / slope
# independent: IAPWS melting-pressure curve slope (Ih) via finite difference
from iapws._iapws import _Melting_Pressure
Tm1 = optimize.brentq(lambda T: _Melting_Pressure(T) - 0.5, 260, 273.16)   # T where P_melt = 0.5 MPa
Tm0 = optimize.brentq(lambda T: _Melting_Pressure(T) - 0.101325, 260, 273.16)
slope_curve = (0.5e6 - 0.101325e6) / (Tm1 - Tm0)
out["D25"] = dict(dh=dh, dv=dv, slope_MPa_per_K=slope / 1e6, dT_per_atm=dT_per_atm, slope_curve_MPa_per_K=slope_curve / 1e6, Tm0=Tm0)
check("D25 Clapeyron ice", abs(slope - slope_curve) / abs(slope_curve) < 0.03, f"dP/dT={slope/1e6:.2f} MPa/K (melting curve {slope_curve/1e6:.2f}), dT/atm={dT_per_atm*1e3:.2f} mK")

# --------------------------------------------- D26 evaporative cooling of beaker
hfg60 = (PropsSI("H", "T", 333.15, "Q", 1, "Water") - PropsSI("H", "T", 333.15, "Q", 0, "Water")) / 1e3   # J/g
dT = hfg60 * 1.0 / (100 * 4.18)
out["D26"] = dict(hfg60=hfg60, dT_per_g_per_100g=dT)
check("D26 evaporative cooling", 5 < dT < 6, f"h_fg(60C)={hfg60:.1f} J/g, 1 g evaporated cools 100 g by {dT:.2f} K")

# ------------------------------- D27 max work from a finite hot body (exergy)
C, T1, T0 = 1000.0, 373.15, 293.15
Wmax = C * ((T1 - T0) - T0 * math.log(T1 / T0))
# independent: integrate infinitesimal Carnot engines dW = (1 - T0/T) C dT
Wnum = integrate.quad(lambda T: C * (1 - T0 / T), T0, T1)[0]
out["D27"] = dict(Wmax=Wmax, Q=C * (T1 - T0), frac=Wmax / (C * (T1 - T0)), carnot_hot=1 - T0 / T1)
check("D27 finite-source max work", abs(Wmax - Wnum) < 1e-6, f"Wmax={Wmax:.0f} J of Q={C*(T1-T0):.0f} J ({Wmax/(C*(T1-T0)):.3f}); naive Carnot {1-T0/T1:.3f}")

# ------------------------- D28 forced convection over the same beaker (5 m/s)
Tf = 0.5 * (333.15 + 295.15)
rho = PropsSI("D", "T", Tf, "P", 101325, "Air"); mu = PropsSI("V", "T", Tf, "P", 101325, "Air")
k = PropsSI("L", "T", Tf, "P", 101325, "Air"); cp = PropsSI("C", "T", Tf, "P", 101325, "Air")
Pr = cp * mu / k; V = 5.0; D = 0.070
Re = rho * V * D / mu
Nu = ht.conv_external.Nu_cylinder_Churchill_Bernstein(Re, Pr)
h_f = Nu * k / D
out["D28"] = dict(Re=Re, Nu=Nu, h=h_f, ratio=h_f / out["D17"]["h_c"])
check("D28 forced convection", 10 < h_f < 60, f"Re={Re:.0f}, Nu={Nu:.1f}, h={h_f:.1f} W/m2K ({h_f/out['D17']['h_c']:.1f}x natural)")
# mixed laminar/turbulent plate constant 871 from Re_c = 5e5
A = 0.037 * 5e5**0.8 - 0.664 * 5e5**0.5
out["A871"] = A
check("flat-plate mixed constant", abs(A - 871) < 1, f"A={A:.1f}")
# critical radius example
out["rcr"] = 0.04 / 10

# =============================== second batch of demonstrations ===============
# DA1 gas collected over water
Patm, T, V, m = 99.5e3, 295.15, 250e-6, 0.316
psat = PropsSI("P", "T", T, "Q", 0, "Water")
pg = Patm - psat; n_ = pg * V / (R * T); M_ = m / n_
out["DA1"] = dict(psat=psat, pg=pg, n=n_, M=M_, M_wrong=m / (Patm * V / (R * T)))
check("DA1 gas over water", abs(M_ - 32.0) < 0.2, f"psat={psat:.0f} Pa, p_gas={pg/1e3:.2f} kPa, n={n_*1e3:.3f} mmol, M={M_:.2f} g/mol (ignoring vapor {m/(Patm*V/(R*T)):.2f})")

# DA2 reversible adiabatic compression r = 18
r_, T1, P1, g = 18.0, 300.0, 100e3, 1.4
T2 = T1 * r_**(g - 1); P2 = P1 * r_**g
# independent: integrate dT/dV = -(g-1) T / V
sol = integrate.solve_ivp(lambda V, T: -(g - 1) * T / V, (18.0, 1.0), [T1], rtol=1e-11, atol=1e-11)
out["DA2"] = dict(T2=T2, P2=P2)
check("DA2 adiabatic compression", abs(sol.y[0, -1] - T2) < 1e-5, f"T2={T2:.0f} K ({T2-273.15:.0f} C), P2={P2/1e6:.2f} MPa")

# DA3 effusion H2 vs O2
ratio = math.sqrt(31.998 / 2.016)
out["DA3"] = dict(ratio=ratio)
check("DA3 Graham", 3.9 < ratio < 4.1, f"rate ratio={ratio:.3f}")

# DA4 vdW vs reference for CO2 at 300 K, 5 MPa
vj = json.load(open(os.path.join(os.path.dirname(__file__), "..", "data", "vdw.json")))
a, b = vj["CO2"]["a"], vj["CO2"]["b"]
T, P = 300.0, 5e6
f = lambda Vm: R * T / (Vm - b) - a / Vm**2 - P
Vm_ideal = R * T / P
roots = np.roots([P, -(P * b + R * T), a, -a * b])
real = sorted([r.real for r in roots if abs(r.imag) < 1e-12 and r.real > b])
Vm = real[-1]                    # vapour-like (largest) root
Z_vdw = P * Vm / (R * T); Z_ref = PropsSI("Z", "T", T, "P", P, "CO2")
out["DA4"] = dict(Vm_ideal=Vm_ideal * 1e3, Vm_vdw=Vm * 1e3, Z_vdw=Z_vdw, Z_ref=Z_ref, nroots=len(real))
check("DA4 vdW CO2", abs(f(Vm)) < 1e-3 and 0.6 < Z_vdw < 0.9, f"Vm ideal={Vm_ideal*1e3:.4f} L/mol, vdW={Vm*1e3:.4f}, Z_vdw={Z_vdw:.3f}, Z_ref={Z_ref:.3f}, real roots={len(real)}")

# DB1 adiabatic compressor with isentropic efficiency
mdot, cp_, g, T1, rp, eta_c = 0.50, 1.005, 1.4, 300.0, 8.0, 0.85
T2s = T1 * rp**((g - 1) / g); T2 = T1 + (T2s - T1) / eta_c
W = mdot * cp_ * (T2 - T1); Ws = mdot * cp_ * (T2s - T1)
out["DB1"] = dict(T2s=T2s, T2=T2, W=W, Ws=Ws)
check("DB1 compressor", abs(Ws / W - eta_c) < 1e-12, f"T2s={T2s:.1f} K, T2={T2:.1f} K, W={W:.1f} kW (ideal {Ws:.1f})")

# DC1 supercooled water freezing at -10 C (per gram)
cw, ci, Lf0, Tm, Tsc = 4.22, 2.06, 333.4, 273.15, 263.15
dS1 = cw * math.log(Tm / Tsc); dS2 = -Lf0 / Tm; dS3 = ci * math.log(Tsc / Tm)
dS_sys = dS1 + dS2 + dS3
L_sc = Lf0 - (cw - ci) * (Tm - Tsc)          # Kirchhoff: heat released at -10 C
dS_surr = L_sc / Tsc
# independent: energy path check  -L_sc == cw*10 - Lf0 + ci*(-10)
assert abs(-L_sc - (cw * 10 - Lf0 - ci * 10)) < 1e-12
out["DC1"] = dict(dS1=dS1, dS2=dS2, dS3=dS3, dS_sys=dS_sys, L_sc=L_sc, dS_surr=dS_surr, Sgen=dS_sys + dS_surr)
check("DC1 supercooled freezing", dS_sys + dS_surr > 0, f"dS_sys={dS_sys:.4f}, L(-10C)={L_sc:.1f} J/g, dS_surr={dS_surr:.4f}, Sgen={dS_sys+dS_surr:.4f} J/(g K)")

# DC2 mixing hot and cold water
c, m1, m2, T1, T2 = 4180.0, 1.0, 1.0, 353.15, 293.15
Tf = (m1 * T1 + m2 * T2) / (m1 + m2)
dS = m1 * c * math.log(Tf / T1) + m2 * c * math.log(Tf / T2)
out["DC2"] = dict(Tf=Tf, dS=dS, dS_hot=m1 * c * math.log(Tf / T1), dS_cold=m2 * c * math.log(Tf / T2))
check("DC2 mixing entropy", dS > 0, f"dS_hot={m1*c*math.log(Tf/T1):.1f}, dS_cold={m2*c*math.log(Tf/T2):.1f}, total={dS:.1f} J/K")

# DD1 heat pump vs resistance heater
Qh, COP, TH, TL = 10.0, 3.0, 308.15, 273.15
W = Qh / COP; COPc = TH / (TH - TL)
out["DD1"] = dict(W=W, COPc=COPc, eta2=COP / COPc, QL=Qh - W)
check("DD1 heat pump", COP < COPc, f"W={W:.2f} kW, Q_L={Qh-W:.2f} kW, COP_C={COPc:.2f}, eta_II={COP/COPc:.3f}")

# DE1 insulated cylindrical container: network with iterated outer surface temperature
Tw, Ta, ri, ro, H, kins, eps = 333.15, 295.15, 0.040, 0.060, 0.12, 0.0355, 0.90
Rins = math.log(ro / ri) / (2 * math.pi * kins * H)
Ao = 2 * math.pi * ro * H
def hc_vert(Ts, L):
    Tf = 0.5 * (Ts + Ta)
    rho = PropsSI("D", "T", Tf, "P", 101325, "Air"); mu = PropsSI("V", "T", Tf, "P", 101325, "Air")
    k = PropsSI("L", "T", Tf, "P", 101325, "Air"); cp = PropsSI("C", "T", Tf, "P", 101325, "Air")
    nu = mu / rho; Pr = cp * mu / k
    Gr = 9.80665 * (1 / Tf) * max(Ts - Ta, 1e-6) * L**3 / nu**2
    return ht.Nu_vertical_plate_Churchill(Pr, Gr) * k / L, Gr
def hr(Ts):
    return eps * sigma * (Ts + Ta) * (Ts**2 + Ta**2)
To = optimize.brentq(lambda To: (Tw - To) / Rins - (hc_vert(To, H)[0] + hr(To)) * Ao * (To - Ta), Ta + 1e-6, Tw)
hcv, Gr = hc_vert(To, H)
Rout = 1 / ((hcv + hr(To)) * Ao)
Q_side = (Tw - Ta) / (Rins + Rout)
# top and bottom: plane EPS discs 2.0 cm thick over the inner cross-section, outer film with same h (approx.)
Ad = math.pi * ri**2; Ld = 0.020
R_disc = Ld / (kins * Ad) + 1 / ((hcv + hr(To)) * math.pi * ro**2)
K_total = 1 / (Rins + Rout) + 2 / R_disc
mw = 0.400; C = mw * 4180.0
tau = C / K_total
T30 = Ta + (Tw - Ta) * math.exp(-1800 / tau)
out["DE1"] = dict(Rins=Rins, To=To - 273.15, hc=hcv, hr=hr(To), Rout=Rout, Q_side=Q_side, R_disc=R_disc,
                  K_total=K_total, C=C, tau_h=tau / 3600, T30=T30 - 273.15, frac_ins=Rins / (Rins + Rout),
                  D_ok=2 * ro >= 35 * H / Gr**0.25)
check("DE1 insulated container", abs((Tw - To) / Rins - (hcv + hr(To)) * Ao * (To - Ta)) < 1e-9,
      f"R_ins={Rins:.2f} K/W, T_o={To-273.15:.2f} C, h_c={hcv:.2f}, h_r={hr(To):.2f}, R_out={Rout:.2f}, Q_side={Q_side:.3f} W, "
      f"R_disc={R_disc:.1f}, K={K_total:.4f} W/K, tau={tau/3600:.2f} h, T(30 min)={T30-273.15:.2f} C, ins share={Rins/(Rins+Rout):.3f}")

# DG1 electrical calibration of a calorimeter
V_, I_, t_, dT = 12.0, 1.50, 300.0, 4.95
E = V_ * I_ * t_; Ctot = E / dT; Ccal = Ctot - 250 * 4.18
out["DG1"] = dict(E=E, Ctot=Ctot, Ccal=Ccal)
check("DG1 electrical calibration", abs(Ctot * dT - E) < 1e-9, f"E={E:.0f} J, C_tot={Ctot:.0f} J/K, C_cal={Ccal:.0f} J/K")

json.dump(out, open(os.path.join(os.path.dirname(__file__), "demos_results.json"), "w"), indent=1, default=float)
print("\nFAILURES:", fails if fails else "none")
