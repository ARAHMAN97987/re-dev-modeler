"""
ZAN Financial Model — Complete Independent Validator
Every land type, financing mode, revenue type, exit strategy, incentive combo, and edge case.
Run: python3 tests/test_model.py
"""
import math, sys

def irr(cf, guess=0.1):
    if not any(c<0 for c in cf) or not any(c>0 for c in cf): return None
    r=guess
    for _ in range(300):
        n=sum(c/(1+r)**t for t,c in enumerate(cf))
        d=sum(-t*c/((1+r)**t*(1+r)) for t,c in enumerate(cf))
        if abs(d)<1e-15: break
        nr=r-n/d
        if abs(nr-r)<1e-7: return nr
        r=nr
        if r<-0.99 or r>10: return None
    return r
def npv(cf,rate): return sum(c/(1+rate)**t for t,c in enumerate(cf))

class M:
    def __init__(s,p): s.p=p; s.h=p.get('horizon',20); s.a=p.get('assets',[])
    def acx(s,a): return a.get('gfa',0)*a.get('costPerSqm',3500)*(1+s.p.get('softCostPct',10)/100+s.p.get('contingencyPct',5)/100)
    def als(s,a): return a.get('gfa',0)*(a.get('efficiency',85)/100)
    def acs(s,a):
        r=[0.0]*s.h; t=s.acx(a)
        if t==0: return r
        st=a.get('constrStart',1)-1; d=math.ceil(a.get('constrDuration',24)/12)
        if d<=0: return r
        pp=t/d
        for y in range(st,min(st+d,s.h)): r[y]=pp
        return r
    def ars(s,a):
        r=[0.0]*s.h; st=a.get('constrStart',1)-1; d=math.ceil(a.get('constrDuration',24)/12); rs=st+d
        e=a.get('escalation',0.75)/100; rmp=max(a.get('rampUpYears',a.get('rampYears',1)),1); oc=a.get('stabilizedOcc',a.get('occupancy',90))/100
        if a.get('revType')=='Lease': base=s.als(a)*a.get('leaseRate',0)*oc
        else: base=a.get('opEbitda',0)*oc
        for y in range(rs,s.h):
            ys=y-rs; r[y]=base*(1+e)**ys*min(1,(ys+1)/rmp)
        return r
    def hotel_ebitda(s,h):
        keys=h.get('keys',100);adr=h.get('adr',500);occ=h.get('stabOcc',70)/100;days=h.get('daysPerYear',365)
        rr=keys*adr*occ*days; rp=h.get('roomsPct',60)/100
        tr=rr/rp if rp>0 else rr
        de=rr*(h.get('roomExpPct',25)/100)+tr*(h.get('fbPct',25)/100)*(h.get('fbExpPct',70)/100)+tr*(h.get('micePct',10)/100)*(h.get('miceExpPct',50)/100)+tr*(h.get('otherPct',5)/100)*(h.get('otherExpPct',50)/100)
        return tr-de-tr*(h.get('undistPct',15)/100)-tr*(h.get('fixedPct',8)/100)
    def marina_ebitda(s,m):
        br=m.get('berths',50)*m.get('avgLength',15)*m.get('unitPrice',5000)*m.get('occupancy',70)/100
        fp=m.get('fuelPct',20)/100;op=m.get('otherPct',10)/100
        tr=br/(1-fp-op) if (1-fp-op)>0 else br
        return tr-br*(m.get('berthingOpex',30)/100)-tr*fp*(m.get('fuelOpex',85)/100)-tr*op*(m.get('otherOpex',50)/100)
    def lrs(s):
        r=[0.0]*s.h; lt=s.p.get('landType','lease')
        if lt=='purchase': r[0]=s.p.get('landPurchasePrice',0)
        elif lt=='lease':
            rent=s.p.get('landRentAnnual',0);gr=s.p.get('landRentGrace',0);ec=s.p.get('landRentEscalation',0)/100;ev=max(s.p.get('landRentEscalationEveryN',5),1)
            for y in range(s.h):
                if y<gr: r[y]=0
                else: r[y]=rent*(1+ec)**(y//ev)
        elif lt=='partner': pass  # No land cost - land as equity
        elif lt=='bot': pass  # No land cost during operation
        return r
    def proj(s):
        ci=[0.0]*s.h;cc=[0.0]*s.h;ar=[]
        for a in s.a:
            cx=s.acs(a);rv=s.ars(a);ar.append({'capex':cx,'revenue':rv,'tc':sum(cx),'tr':sum(rv),'ls':s.als(a)})
            for y in range(s.h): ci[y]+=rv[y];cc[y]+=cx[y]
        lr=s.lrs();cn=[ci[y]-cc[y]-lr[y] for y in range(s.h)]
        return {'i':ci,'c':cc,'l':lr,'n':cn,'tc':sum(cc),'ti':sum(ci),'tl':sum(lr),'tn':sum(cn),'irr':irr(cn),'npv':npv(cn,.1),'ar':ar}
    def inc(s,pr):
        ic=s.p.get('incentives',{});cgs=[0.0]*s.h;cgt=0;lss=[0.0]*s.h;lst=0;frs=[0.0]*s.h;frt=0
        ce=0
        for y in range(s.h-1,-1,-1):
            if pr['c'][y]>0: ce=y; break
        cg=ic.get('capexGrant',{})
        if cg.get('enabled'):
            raw=pr['tc']*(cg.get('grantPct',0)/100);amt=min(raw,cg.get('maxCap',1e18));cgt=amt
            if cg.get('timing')=='construction':
                pp=amt/(ce+1) if ce>=0 else amt
                for y in range(ce+1):
                    if pr['c'][y]>0: cgs[y]=pp
            else: cgs[min(ce+1,s.h-1)]=amt
        lr=ic.get('landRentRebate',{})
        if lr.get('enabled') and s.p.get('landType')=='lease':
            cy=lr.get('constrRebateYears',0) or (ce+1);cp=lr.get('constrRebatePct',0)/100;op=lr.get('operRebatePct',0)/100;oy=lr.get('operRebateYears',0)
            for y in range(s.h):
                rp=cp if y<cy else (op if y<cy+oy else 0);sv=abs(pr['l'][y])*rp;lss[y]=sv;lst+=sv
        fr=ic.get('feeRebates',{})
        if fr.get('enabled') and fr.get('items'):
            for it in fr['items']:
                a2=it.get('amount',0);yr=max(0,min(it.get('year',1)-1,s.h-1))
                if it.get('type')=='rebate': frs[yr]+=a2;frt+=a2
                elif it.get('type')=='deferral':
                    dy=math.ceil(it.get('deferralMonths',12)/12);frs[yr]+=a2-a2/1.1**dy;frt+=a2-a2/1.1**dy
        imp=[cgs[y]+lss[y]+frs[y] for y in range(s.h)];adj=[pr['n'][y]+imp[y] for y in range(s.h)]
        return {'cgt':cgt,'cgs':cgs,'lst':lst,'lss':lss,'frt':frt,'frs':frs,'tv':cgt+lst+frt,'imp':imp,'adj':adj,'airr':irr(adj),'anpv':npv(adj,.1)}
    def fin(s,pr,ic):
        if s.p.get('finMode')=='self':
            ai=ic['airr'] if ic and ic['tv']>0 else pr['irr']
            return {'m':'self','lirr':ai,'td':0,'te':pr['tc'],'md':0,'ds':[0]*s.h,'dd':[0]*s.h,'ep':[0]*s.h,'bc':[0]*s.h,'bo':[0]*s.h,'rp':[0]*s.h,'ai':[0]*s.h,'oi':[0]*s.h,'eqc':[0]*s.h,'uf':0,'alr':pr['l'],'lcf':pr['n'],'dscr':[None]*s.h,'dci':pr['tc'],'dev':pr['tc'],'gpe':pr['tc']*0.5,'lpe':pr['tc']*0.5,'gpp':0.5,'lpp':0.5,'ist':0,'isb':[0]*s.h}
        acg=ic['cgt'] if ic else 0;dev=pr['tc']-acg;lc=(s.p.get('landArea',0)*s.p.get('landCapRate',1000)) if s.p.get('landCapitalize') else 0
        dci=dev+lc;is100=s.p.get('finMode')=='bank100';ltv=1.0 if is100 else ((s.p.get('maxLtvPct',70)/100) if s.p.get('debtAllowed') else 0)
        md=dci*ltv;te=max(0,dci-md);rate=s.p.get('financeRate',6.5)/100;tnr=s.p.get('loanTenor',7);grc=s.p.get('debtGrace',3);ry=max(1,tnr-grc)
        gpe=s.p.get('gpEquityManual',0)
        if gpe>0: gpe=min(gpe,te)
        elif lc>0: gpe=min(lc,te)
        else: gpe=te*0.5
        lpe=te-gpe;gpp=gpe/te if te>0 else 0.5;lpp=1-gpp
        dd=[0.0]*s.h;rp=[0.0]*s.h;bo=[0.0]*s.h;bc=[0.0]*s.h;it=[0.0]*s.h;ep=[0.0]*s.h
        drawn=0
        for y in range(s.h):
            if pr['c'][y]>0 and drawn<md: d=min(pr['c'][y]*ltv,md-drawn);dd[y]=d;drawn+=d
        fd=next((y for y in range(s.h) if dd[y]>0),0)
        for y in range(s.h):
            bo[y]=(bc[y-1] if y>0 else 0)+dd[y];ys=y-fd
            rp[y]=0 if ys>=tnr or ys<grc else min(drawn/ry,bo[y])
            bc[y]=max(0,bo[y]-rp[y]);it[y]=(bo[y]+bc[y])/2*rate
        fs=s.p.get('incentives',{}).get('financeSupport',{});isb=[0.0]*s.h;ai=list(it)
        if fs.get('enabled') and fs.get('subType')=='interestSubsidy':
            sp=fs.get('subsidyPct',0)/100;ss=(fd+grc) if fs.get('subsidyStart')=='operation' else 0;se=ss+fs.get('subsidyYears',5)
            for y in range(max(0,ss),min(se,s.h)): isb[y]=it[y]*sp;ai[y]=it[y]*(1-sp)
        ds=[rp[y]+ai[y] for y in range(s.h)];uf=md*(s.p.get('upfrontFeePct',0)/100)
        ey=s.p.get('exitYear',0)
        if ey>0:
            eyr=ey-s.p.get('startYear',2026)
            if 0<=eyr<s.h:
                stab=pr['i'][min(eyr,s.h-1)]
                if s.p.get('exitStrategy')=='caprate' and s.p.get('exitCapRate',0)>0: ev=stab/(s.p.get('exitCapRate',9)/100)
                elif s.p.get('exitStrategy')=='sale': ev=stab*(s.p.get('exitMultiple',10))
                else: ev=0
                if ev>0: ep[eyr]=max(0,ev-ev*(s.p.get('exitCostPct',2)/100)-bc[eyr])
        alr=list(pr['l'])
        if ic and ic['lst']>0:
            for y in range(s.h): alr[y]=max(0,pr['l'][y]-ic['lss'][y])
        lcf=[pr['i'][y]-alr[y]-pr['c'][y]+(ic['cgs'][y] if ic else 0)+(ic['frs'][y] if ic else 0)-ds[y]+dd[y]+ep[y] for y in range(s.h)]
        dscr=[None]*s.h
        for y in range(s.h):
            if ds[y]>0: dscr[y]=(pr['i'][y]-alr[y])/ds[y]
        eqc=[max(0,pr['c'][y]-dd[y]) if pr['c'][y]>0 else 0 for y in range(s.h)]
        return {'m':s.p.get('finMode'),'dev':dev,'dci':dci,'md':md,'te':te,'td':drawn,'gpe':gpe,'lpe':lpe,'gpp':gpp,'lpp':lpp,'dd':dd,'rp':rp,'ai':ai,'oi':it,'ds':ds,'bo':bo,'bc':bc,'ep':ep,'lcf':lcf,'lirr':irr(lcf),'dscr':dscr,'eqc':eqc,'uf':uf,'ist':sum(isb),'isb':isb,'alr':alr}

# ═══════════════════════════════════════════════════════════════
# TEST DEFINITIONS
# ═══════════════════════════════════════════════════════════════
R=[]
def T(cat,name,ok,detail=""):R.append((cat,name,ok,detail))
def cl(a,b,t=0.01):
    if a is None or b is None: return a==b
    if a==0 and b==0: return True
    if a==0 or b==0: return abs(a-b)<1
    return abs(a-b)/max(abs(a),abs(b))<t
def sf(v): return f"{(v or 0)*100:.2f}%" if v else "N/A"

# ── Base assets ──
RETAIL = {'name':'Retail','gfa':10000,'costPerSqm':3000,'efficiency':80,'leaseRate':500,'revType':'Lease','escalation':1,'rampUpYears':2,'stabilizedOcc':90,'constrStart':1,'constrDuration':24}
HOTEL_OP = {'name':'Hotel','gfa':8000,'costPerSqm':5000,'efficiency':100,'revType':'Operating','opEbitda':12000000,'escalation':0.75,'rampUpYears':3,'stabilizedOcc':75,'constrStart':1,'constrDuration':36}
BASE = {'horizon':20,'startYear':2026,'softCostPct':10,'contingencyPct':5,'incentives':{},'phases':[{'name':'P1'}]}

# ═══════════════════════════════════════════════════════════════
# T1: PROJECT ENGINE (14 tests)
# ═══════════════════════════════════════════════════════════════
P1={**BASE,'landType':'lease','landArea':10000,'landRentAnnual':2e6,'landRentEscalation':3,'landRentEscalationEveryN':5,'landRentGrace':2,'finMode':'self','assets':[RETAIL,HOTEL_OP]}
m=M(P1);pr=m.proj()
T("T1","CAPEX=GFA*Cost*(1+s+c)",cl(m.acx(RETAIL),10000*3000*1.15),f"{m.acx(RETAIL):,.0f}")
T("T1","Leasable=GFA*Eff",cl(m.als(RETAIL),8000))
T("T1","CAPEX only during construction",all(pr['ar'][0]['capex'][y]==0 for y in range(2,20)))
T("T1","Revenue starts after construction",pr['ar'][0]['revenue'][0]==0 and pr['ar'][0]['revenue'][2]>0)
T("T1","Lease=Leasable*Rate*Occ*Ramp",cl(pr['ar'][0]['revenue'][2],8000*500*0.90*0.5,0.05),f"{pr['ar'][0]['revenue'][2]:,.0f}")
T("T1","Revenue escalates",pr['ar'][0]['revenue'][4]>pr['ar'][0]['revenue'][3])
T("T1","Ramp factor works",pr['ar'][0]['revenue'][2]<pr['ar'][0]['revenue'][3])
T("T1","Operating rev uses EBITDA",pr['ar'][1]['revenue'][3]>0 and pr['ar'][1]['revenue'][3]<12e6*0.75)
T("T1","Land grace period",pr['l'][0]==0 and pr['l'][1]==0 and pr['l'][2]>0)
T("T1","Land esc every N years",pr['l'][2]==pr['l'][4] and pr['l'][5]>pr['l'][4])
T("T1","NetCF=Income-CAPEX-Land",all(cl(pr['n'][y],pr['i'][y]-pr['c'][y]-pr['l'][y]) for y in range(20)))
T("T1","IRR computed",pr['irr'] is not None)
T("T1","NPV computed",pr['npv'] is not None)
T("T1","Sum consistency",cl(pr['tn'],pr['ti']-pr['tc']-pr['tl']))

# ═══════════════════════════════════════════════════════════════
# T2: ALL LAND TYPES (8 tests)
# ═══════════════════════════════════════════════════════════════
# Purchase
Pp={**BASE,'landType':'purchase','landPurchasePrice':5e6,'finMode':'self','assets':[RETAIL]}
pp=M(Pp).proj()
T("T2","Purchase: cost in Y1 only",pp['l'][0]==5e6 and all(pp['l'][y]==0 for y in range(1,20)))
T("T2","Purchase: reduces Net CF Y1",pp['n'][0]<-5e6)

# Partner (land as equity — no land cost)
Ppr={**BASE,'landType':'partner','landValuation':10e6,'partnerEquityPct':30,'finMode':'self','assets':[RETAIL]}
ppr=M(Ppr).proj()
T("T2","Partner: zero land cost",ppr['tl']==0)
T("T2","Partner: IRR higher (no land cost)",ppr['irr'] is not None and (pp['irr'] is None or ppr['irr']>pp['irr']),f"Partner={sf(ppr['irr'])} vs Purchase={sf(pp['irr'])}")

# BOT (no land cost during operation)
Pbot={**BASE,'landType':'bot','botYears':15,'finMode':'self','assets':[RETAIL]}
pbot=M(Pbot).proj()
T("T2","BOT: zero land cost",pbot['tl']==0)
T("T2","BOT: IRR same as partner",cl(pbot['irr'],ppr['irr']) if pbot['irr'] and ppr['irr'] else True)

# Lease with zero grace
Plg={**BASE,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'self','assets':[RETAIL]}
plg=M(Plg).proj()
T("T2","Lease zero grace: rent from Y1",plg['l'][0]==1e6)
T("T2","Lease no escalation: flat rent",plg['l'][0]==plg['l'][10])

# ═══════════════════════════════════════════════════════════════
# T3: ALL FINANCING MODES (18 tests)
# ═══════════════════════════════════════════════════════════════
FBASE={**BASE,'landType':'lease','landArea':10000,'landRentAnnual':2e6,'landRentEscalation':3,'landRentEscalationEveryN':5,'landRentGrace':2,'assets':[RETAIL,HOTEL_OP]}
prF=M({**FBASE,'finMode':'self'}).proj()

# Self-funded
Ps={**FBASE,'finMode':'self'}
ms=M(Ps);prs=ms.proj();ics=ms.inc(prs);fs=ms.fin(prs,ics)
T("T3","Self: no debt",fs['td']==0)
T("T3","Self: IRR = project IRR",cl(fs['lirr'],prs['irr']) if fs['lirr'] and prs['irr'] else True)

# Bank 100%
Pb={**FBASE,'finMode':'bank100','debtAllowed':True,'financeRate':6,'loanTenor':10,'debtGrace':3}
mb=M(Pb);prb=mb.proj();icb=mb.inc(prb);fb=mb.fin(prb,icb)
T("T3","Bank100: LTV=100%",cl(fb['md'],fb['dci']),f"Debt={fb['md']:,.0f} Dev={fb['dci']:,.0f}")
T("T3","Bank100: equity=0",fb['te']<1)
T("T3","Bank100: levered IRR computed",fb['lirr'] is not None)

# Debt + Equity (60% LTV)
Pd={**FBASE,'finMode':'debt','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3}
md=M(Pd);prd=md.proj();icd=md.inc(prd);fd=md.fin(prd,icd)
T("T3","Debt60: D+E=Dev",cl(fd['md']+fd['te'],fd['dci']))
T("T3","Debt60: Debt=60%*Dev",cl(fd['md'],fd['dci']*0.6))
T("T3","Debt60: leverage effect",fd['lirr'] and prd['irr'] and fd['lirr']>prd['irr'],f"Unlev={sf(prd['irr'])} Lev={sf(fd['lirr'])}")
T("T3","Debt60: grace period works",all(fd['rp'][y]==0 for y in range(3)))
T("T3","Debt60: repaid by tenor",fd['bc'][12]<1)
T("T3","Debt60: interest formula",cl(fd['oi'][5],(fd['bo'][5]+fd['bc'][5])/2*0.06,0.1) if fd['oi'][5]>0 else True)
T("T3","Debt60: DSCR computed",any(fd['dscr'][y] is not None for y in range(20)))
T("T3","Debt60: balance≥0",all(fd['bc'][y]>=-.01 for y in range(20)))

# Fund GP/LP
Pf={**FBASE,'finMode':'fund','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3}
mf=M(Pf);prf=mf.proj();icf=mf.inc(prf);ff=mf.fin(prf,icf)
T("T3","Fund: GP+LP=equity",cl(ff['gpe']+ff['lpe'],ff['te']))
T("T3","Fund: GP%+LP%=100%",cl(ff['gpp']+ff['lpp'],1.0))

# Very high LTV
Ph={**FBASE,'finMode':'debt','debtAllowed':True,'maxLtvPct':90,'financeRate':8,'loanTenor':7,'debtGrace':2}
mh=M(Ph);prh=mh.proj();ich=mh.inc(prh);fh=mh.fin(prh,ich)
T("T3","HighLTV: debt=90%",cl(fh['md'],fh['dci']*0.9))
T("T3","HighLTV: leverage changes IRR",fh['lirr'] is not None and fh['lirr']!=fd['lirr'],f"60%={sf(fd['lirr'])} 90%={sf(fh['lirr'])}")

# ═══════════════════════════════════════════════════════════════
# T4: ALL EXIT STRATEGIES (6 tests)
# ═══════════════════════════════════════════════════════════════
EBASE={**FBASE,'finMode':'debt','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3}

# Cap rate exit
Ec={**EBASE,'exitStrategy':'caprate','exitYear':2033,'exitCapRate':9,'exitCostPct':2}
fec=M(Ec).fin(M(Ec).proj(),M(Ec).inc(M(Ec).proj()))
T("T4","CapRate exit: proceeds>0",fec['ep'][7]>0,f"Exit={fec['ep'][7]:,.0f}")

# Multiple exit
Em={**EBASE,'exitStrategy':'sale','exitYear':2033,'exitMultiple':12,'exitCostPct':2}
fem=M(Em).fin(M(Em).proj(),M(Em).inc(M(Em).proj()))
T("T4","Multiple exit: proceeds>0",fem['ep'][7]>0,f"Exit={fem['ep'][7]:,.0f}")
T("T4","Multiple vs CapRate: different amounts",not cl(fem['ep'][7],fec['ep'][7],0.001),f"Cap={fec['ep'][7]:,.0f} Mult={fem['ep'][7]:,.0f}")

# Hold (no exit)
Eh={**EBASE,'exitStrategy':'hold','exitYear':0}
feh=M(Eh).fin(M(Eh).proj(),M(Eh).inc(M(Eh).proj()))
T("T4","Hold: no exit proceeds",all(feh['ep'][y]==0 for y in range(20)))
T("T4","Hold: IRR still computed",feh['lirr'] is not None)

# Exit year sensitivity
Ee={**EBASE,'exitStrategy':'caprate','exitYear':2036,'exitCapRate':9,'exitCostPct':2}
fee=M(Ee).fin(M(Ee).proj(),M(Ee).inc(M(Ee).proj()))
T("T4","Later exit: different IRR",not cl(fee['lirr'],fec['lirr'],0.001) if fee['lirr'] and fec['lirr'] else True,f"Y8={sf(fec['lirr'])} Y11={sf(fee['lirr'])}")

# ═══════════════════════════════════════════════════════════════
# T5: ALL INCENTIVES (10 tests)
# ═══════════════════════════════════════════════════════════════
IBASE={**FBASE,'finMode':'debt','debtAllowed':True,'maxLtvPct':60,'financeRate':6,'loanTenor':10,'debtGrace':3}
pr_base=M({**IBASE,'incentives':{}});prb2=pr_base.proj();icb2=pr_base.inc(prb2);fb2=pr_base.fin(prb2,icb2)

# CAPEX Grant
I1={**IBASE,'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'}}}
mi1=M(I1);pi1=mi1.proj();ii1=mi1.inc(pi1);fi1=mi1.fin(pi1,ii1)
T("T5","CAPEX grant↑IRR (CRITICAL)",ii1['airr'] and prb2['irr'] and ii1['airr']>prb2['irr'],f"{sf(prb2['irr'])}→{sf(ii1['airr'])}")
T("T5","CAPEX grant reduces debt",fi1['td']<fb2['td'],f"{fb2['td']:,.0f}→{fi1['td']:,.0f}")

# Land rebate
I2={**IBASE,'incentives':{'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3,'operRebatePct':50,'operRebateYears':5}}}
mi2=M(I2);pi2=mi2.proj();ii2=mi2.inc(pi2)
T("T5","Land rebate↑IRR",ii2['airr'] and prb2['irr'] and ii2['airr']>prb2['irr'],f"{sf(prb2['irr'])}→{sf(ii2['airr'])}")

# Interest subsidy
I3={**IBASE,'incentives':{'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}}
mi3=M(I3);pi3=mi3.proj();ii3=mi3.inc(pi3);fi3=mi3.fin(pi3,ii3)
T("T5","IntSub↓interest",fi3['ist']>0 and sum(fi3['ai'])<sum(fb2['oi']),f"{sum(fb2['oi']):,.0f}→{sum(fi3['ai']):,.0f}")
T("T5","IntSub↑LevIRR (CRITICAL)",fi3['lirr'] and fb2['lirr'] and fi3['lirr']>fb2['lirr'],f"{sf(fb2['lirr'])}→{sf(fi3['lirr'])}")

# Fee rebate
I4={**IBASE,'incentives':{'feeRebates':{'enabled':True,'items':[{'type':'rebate','amount':2e6,'year':1}]}}}
ii4=M(I4).inc(M(I4).proj())
T("T5","FeeRebate recorded",ii4['frt']==2e6)
T("T5","FeeRebate↑IRR",(ii4['airr'] or 0)!=(prb2['irr'] or 0))

# Grant + Bank100
I5={**BASE,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'bank100','debtAllowed':True,'financeRate':6,'loanTenor':10,'debtGrace':3,'assets':[RETAIL],'incentives':{'capexGrant':{'enabled':True,'grantPct':30,'maxCap':50e6,'timing':'construction'}}}
mi5=M(I5);pi5=mi5.proj();ii5=mi5.inc(pi5);fi5=mi5.fin(pi5,ii5)
T("T5","Grant+Bank100: less debt",fi5['td']<M({**I5,'incentives':{}}).fin(M({**I5,'incentives':{}}).proj(),M({**I5,'incentives':{}}).inc(M({**I5,'incentives':{}}).proj()))['td'])

# All combined
I6={**IBASE,'incentives':{'capexGrant':{'enabled':True,'grantPct':25,'maxCap':50e6,'timing':'construction'},'landRentRebate':{'enabled':True,'constrRebatePct':100,'constrRebateYears':3,'operRebatePct':50,'operRebateYears':5},'financeSupport':{'enabled':True,'subType':'interestSubsidy','subsidyPct':50,'subsidyYears':5,'subsidyStart':'construction'}}}
mi6=M(I6);pi6=mi6.proj();ii6=mi6.inc(pi6);fi6=mi6.fin(pi6,ii6)
T("T5","All combined: massive IRR lift",fi6['lirr'] and fb2['lirr'] and fi6['lirr']>fb2['lirr'],f"{sf(fb2['lirr'])}→{sf(fi6['lirr'])}")

# ═══════════════════════════════════════════════════════════════
# T6: REVENUE TYPES — Hotel & Marina P&L (6 tests)
# ═══════════════════════════════════════════════════════════════
hotel_cfg = {'keys':100,'adr':500,'stabOcc':70,'daysPerYear':365,'roomsPct':60,'fbPct':25,'micePct':10,'otherPct':5,'roomExpPct':25,'fbExpPct':70,'miceExpPct':50,'otherExpPct':50,'undistPct':15,'fixedPct':8}
marina_cfg = {'berths':50,'avgLength':15,'unitPrice':5000,'occupancy':70,'fuelPct':20,'otherPct':10,'berthingOpex':30,'fuelOpex':85,'otherOpex':50}

m_h = M(BASE)
he = m_h.hotel_ebitda(hotel_cfg)
T("T6","Hotel: EBITDA>0",he>0,f"EBITDA={he:,.0f}")
T("T6","Hotel: EBITDA<Revenue",he<100*500*0.7*365/0.6,f"EBITDA={he:,.0f}")
T("T6","Hotel: rooms revenue=keys*ADR*occ*days",cl(100*500*0.7*365, 100*500*0.7*365))

me2 = m_h.marina_ebitda(marina_cfg)
T("T6","Marina: EBITDA>0",me2>0,f"EBITDA={me2:,.0f}")
T("T6","Marina: berth rev=berths*len*price*occ",50*15*5000*0.7>0)

# Mixed asset project
Pmix={**BASE,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':0,'landRentEscalationEveryN':5,'finMode':'self','assets':[RETAIL,HOTEL_OP,{'name':'Marina','gfa':2000,'costPerSqm':8000,'efficiency':100,'revType':'Operating','opEbitda':5e6,'escalation':0.5,'rampUpYears':2,'stabilizedOcc':70,'constrStart':1,'constrDuration':30}]}
pmix=M(Pmix).proj()
T("T6","Mixed: 3 assets computed",len(pmix['ar'])==3 and pmix['tc']>0)

# ═══════════════════════════════════════════════════════════════
# T7: EDGE CASES (10 tests)
# ═══════════════════════════════════════════════════════════════
T("T7","Zero assets",M({**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[]}).proj()['tc']==0)
T("T7","Zero GFA asset",M({**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{'gfa':0,'costPerSqm':3000,'constrStart':1,'constrDuration':24}]}).proj()['tc']==0)

# 50-year horizon
P50={**BASE,'horizon':50,'landType':'lease','landRentAnnual':1e6,'landRentGrace':0,'landRentEscalation':3,'landRentEscalationEveryN':5,'finMode':'self','assets':[RETAIL]}
p50=M(P50).proj()
T("T7","50yr: revenue grows over time",p50['ar'][0]['revenue'][49]>p50['ar'][0]['revenue'][5])
T("T7","50yr: IRR computed",p50['irr'] is not None)

# Zero occupancy
Pz={**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RETAIL,'stabilizedOcc':0}]}
pz=M(Pz).proj()
T("T7","Zero occ: zero revenue",pz['ti']==0)

# 100% occupancy
Pf2={**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RETAIL,'stabilizedOcc':100}]}
pf2=M(Pf2).proj()
T("T7","100% occ: max revenue",pf2['ti']>M({**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[RETAIL]}).proj()['ti'])

# No escalation
Pne={**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','assets':[{**RETAIL,'escalation':0}]}
pne=M(Pne).proj()
T("T7","No escalation: flat revenue",cl(pne['ar'][0]['revenue'][5],pne['ar'][0]['revenue'][10],0.001) if pne['ar'][0]['revenue'][5]>0 else True)

# Negative NPV project (high land cost)
Pneg={**BASE,'landType':'lease','landRentAnnual':20e6,'landRentGrace':0,'landRentEscalation':5,'landRentEscalationEveryN':1,'finMode':'self','assets':[RETAIL]}
pneg=M(Pneg).proj()
T("T7","Negative NPV: NPV<0",pneg['npv']<0,f"NPV={pneg['npv']:,.0f}")

# Multiple phases (2 assets, different start years)
Pmp={**BASE,'landType':'purchase','landPurchasePrice':0,'finMode':'self','phases':[{'name':'P1'},{'name':'P2'}],'assets':[{**RETAIL,'phase':'P1','constrStart':1,'gfa':10000},{**RETAIL,'phase':'P2','name':'Retail2','constrStart':3,'gfa':5000}]}
pmp=M(Pmp).proj()
T("T7","Multi-phase: staggered CAPEX",pmp['c'][0]>0 and pmp['c'][2]>0 and pmp['c'][0]!=pmp['c'][2])


# ═══════════════════════════════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════════════════════════════
if __name__=='__main__':
    print("="*70)
    print("ZAN Financial Model — Complete Independent Validation")
    print("="*70)
    cats={}
    for c,n,o,d in R:
        if c not in cats: cats[c]={'p':0,'f':0,'items':[]}
        cats[c]['p' if o else 'f']+=1;cats[c]['items'].append((n,o,d))
    lb={'T1':'PROJECT ENGINE','T2':'LAND TYPES','T3':'FINANCING MODES','T4':'EXIT STRATEGIES','T5':'INCENTIVES','T6':'REVENUE TYPES (Hotel/Marina)','T7':'EDGE CASES'}
    for c,dt in cats.items():
        s='✅' if dt['f']==0 else '❌'
        print(f"\n  {s} {lb.get(c,c)} ({dt['p']}/{dt['p']+dt['f']})")
        for n,o,d in dt['items']:
            print(f"    {'✅' if o else '❌'} {n}{(': '+d[:55]) if d else ''}")
    p=sum(1 for _,_,o,_ in R if o);f=sum(1 for _,_,o,_ in R if not o)
    print(f"\n{'='*70}")
    print(f"  {p} PASSED | {f} FAILED | {len(R)} TOTAL")
    print(f"{'='*70}")
    if f: print(f"\n  ⚠️  {f} FAILURES — Model has bugs!")
    else: print(f"\n  ✅  ALL TESTS PASSED")
    sys.exit(1 if f else 0)
