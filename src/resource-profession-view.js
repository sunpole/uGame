const names={stone:'Камень',wood:'Дерево',water:'Вода',clay:'Глина'};
export class ResourceProfessionView {
  constructor({professions,relationships,interactionPanel,buyItem,consumeItem,getItemCount,activities,getRun}={}) {
    this.professions=professions;
    this.relationships=relationships;
    this.panel=interactionPanel;
    this.buyItem=buyItem;
    this.consumeItem=consumeItem;
    this.getItemCount=getItemCount;
    this.activities=activities;
    this.getRun=getRun;
  }
  openTraining(spawn,info='') {
    const id=spawn.resourceDirectionId,progress=this.professions.get(id);
    if(!progress)return false;
    const lvl=this.professions.level(id),points=this.professions.availablePoints(id);
    const reputation=this.relationships.get(spawn.masterId);
    const nodes=this.professions.config.skillNodes;
    const actions=[
      {
        id:'training-practice',
        label:progress.trainingEncounters.includes(spawn.encounterId)?'Знакомство пройдено ✓':'Практика с Мастером (1 раз за встречу)',
        disabled:progress.trainingEncounters.includes(spawn.encounterId),
        onSelect:()=>{
          const result=this.professions.practice(spawn,{
            onReputation:(masterId,xp)=>this.relationships.addRelationshipXp(masterId,xp)
          });
          this.openTraining(spawn,result.ok?'Практика: +'+result.reputationXp+' репутации и +'+result.professionXp+' опыта профессии':'Практика уже пройдена');
          return result.ok;
        }
      },
      ...nodes.map(node=>({
        id:'training-'+node.id,
        label:node.label+' ('+progress.skills[node.id]+'/'+node.maxRank+')',
        disabled:points<=0 || progress.skills[node.id]>=node.maxRank,
        hint:node.description,
        onSelect:()=>{
          const result=this.professions.invest(id,node.id);
          this.openTraining(spawn,result.ok?'Навык улучшен, ранг '+result.rank:result.reason==='level'?'Нужен уровень профессии '+result.requiredLevel:'Недостаточно очков или достигнут предел');
          return result.ok;
        }
      })),
      {
        id:'buy-gatherer-gloves',
        label:'Купить рабочие перчатки · 200 Шагов',
        hint:'Экипируй в слот перчаток: +15% добычи; простой полевой инструмент в рюкзаке даёт такой же бонус (не суммируется)',
        onSelect:()=>{
          const success=this.buyItem?.('gatherer-gloves',200)===true;
          this.openTraining(spawn,success?'Перчатки в рюкзаке: экипируйте их через Инвентарь':'Недостаточно Шагов или места');
          return success;
        }
      },
      ...(this.professions.config.buffItems||[]).map(buff=>({
        id:'buy-'+buff.id,
        label:'Купить '+buff.label+' · '+buff.costSteps+' Шагов',
        hint:buff.effect==='xp'?'+25% опыта профессии, 15 мин':'+30% добычи, 10 мин',
        onSelect:()=>{
          const success=this.buyItem?.(buff.id,buff.costSteps)===true;
          this.openTraining(spawn,success?'Предмет добавлен в рюкзак':'Недостаточно Шагов или места в рюкзаке');
          return success;
        }
      }))
    ];
    this.panel.showActions({
      title:'Профессия · '+(names[id]||id),
      text:'Общее дерево направления для всех Мастеров этого ресурса. Уровень '+lvl
        +' · XP '+progress.xp+' · свободно очков '+points+'. Отношения с этим NPC: '
        +(reputation?.relationshipLevel||0)+' ур. ('+(reputation?.relationshipXp||0)+' XP).'
        +' Тренировка доступна только при выпавшем модуле развития. Очки тратятся без сброса.',
      actions,
      meta:info||'Допуски T2–T8 требуют соответствующего ранга дерева, уровня профессии и репутации у конкретного Мастера.'
    });
    return true;
  }

  openAnalytics(spawn,info='') {
    const id=spawn.resourceDirectionId,progress=this.professions.get(id);
    if(!progress)return false;
    const relation=this.relationships.get(spawn.masterId);
    const buffs=this.professions.modifiers(id);
    const ranks=progress.skills;
    const lines=this.professions.config.tierRequirements.map(req=>{
      const access=this.professions.access(id,req.tier,relation?.relationshipLevel||0);
      return req.tier+' · дерево '+req.tier.slice(1)+'/8 · профессия '+req.professionLevel
        +' · репутация '+req.reputationLevel+' → '+(access.ok?'ОТКРЫТО':'закрыто');
    });
    const buffActions=(this.professions.config.buffItems||[]).map(buff=>{
      const remaining=Math.max(0,Math.ceil(((progress.buffs[buff.id]||0)-Date.now())/1000));
      const owned=this.getItemCount?.(buff.id)||0;
      return {
        id:'activate-'+buff.id,
        label:buff.label+' ×'+owned+(remaining>0?' · активен':' · применить'),
        disabled:remaining>0||owned<=0,
        hint:buff.effect==='xp'?'+25% опыта на 15 минут':'+30% добычи на 10 минут',
        onSelect:()=>{
          const result=this.consumeItem?.(buff.id,id);
          this.openAnalytics(spawn,result?'Усиление активно':'Предмет недоступен или усиление уже действует');
          return result===true;
        }
      };
    });
    const report=this.activities?.progress?.(spawn,'analytics',this.getRun?.());
    if(report?.available){
      buffActions.push({
        id:'analytics-report-bonus',
        label:report.claimed?'Награда за анализ получена ✓':'Получить бонус за аналитический отчёт',
        disabled:!report.ready,
        hint:'Требуется ранг аналитики '+report.requiredRank+' и '+(report.target/10).toFixed(1)
          +' кг добычи в текущей экспедиции: '+(report.current/10).toFixed(1)+' / '+(report.target/10).toFixed(1)+' кг',
        onSelect:()=>{
          const result=this.activities.claim(spawn,'analytics',this.getRun?.());
          this.openAnalytics(spawn,result.ok?'Бонус за анализ получен':result.reason);
          return result.ok;
        }
      });
    }
    this.panel.showActions({
      title:'Аналитика · '+(names[id]||id),
      text:'Профессия '+this.professions.level(id)+' · XP '+progress.xp
        +' · освоено '+(progress.harvestedUnits/10).toFixed(1)+' кг'
        +' · экспедиций '+progress.expeditionCount+' · ручных ударов '+progress.manualAttempts
        +' · автоциклов '+progress.autoCycles+'.'
        +' Бонус аналитики +'+(ranks.analytics*10)+'% XP.'
        +' Техника '+ranks.extraction+'/5 · бережливость '+ranks.efficiency+'/5.'
        +'\n\n'+lines.join('\n'),
      actions:buffActions,
      meta:info||'Профессия развивается добычей. Усиления расходуют предметы из рюкзака и действуют по REAL TIME.'
    });
    return true;
  }

  openQuest(spawn,info=''){
    const state=this.activities?.progress?.(spawn,'quest',this.getRun?.());
    if(!state?.available)return false;
    const task=this.activities.config.quest;
    this.panel.showActions({
      title:'Квест · '+task.title,
      text:'Мастер просит добыть '+(task.targetUnits/10).toFixed(1)+' кг '+(names[spawn.resourceDirectionId]||spawn.resourceDirectionId)
        +' за эту встречу. Прогресс '+(state.current/10).toFixed(1)+' / '+(state.target/10).toFixed(1)+' кг.'
        +' За выполнение: Шаги +'+task.stepsPerMasterTier*Number(spawn.tier.slice(1))
        +', опыт профессии и репутация именно этого Мастера.',
      actions:[
        {
          id:'quest-accept',label:state.accepted?'Поручение принято ✓':'Принять поручение',
          disabled:state.accepted||state.claimed,
          onSelect:()=>{
            const result=this.activities.acceptQuest(spawn);
            this.openQuest(spawn,result.ok?'Задание принято':'Уже принято');
            return result.ok;
          }
        },
        {
          id:'quest-claim',label:state.claimed?'Награда получена ✓':'Завершить поручение / получить награду',
          disabled:!state.ready,
          onSelect:()=>{
            const result=this.activities.claim(spawn,'quest',this.getRun?.());
            this.openQuest(spawn,result.ok?'Поручение выполнено, награды выданы':result.reason);
            return result.ok;
          }
        }
      ],
      meta:info||'Один квест на Encounter. Груз ресурсной экспедиции не расходуется на исполнение поручения.'
    });
    return true;
  }
  openSpecial(spawn,info=''){
    const state=this.activities?.progress?.(spawn,'special',this.getRun?.());
    if(!state?.available)return false;
    const cfg=this.activities.config.special;
    this.panel.showActions({
      title:'Особое событие · '+cfg.title,
      text:'Проведи '+state.target+' точных ручных удара в экспедиции этой встречи.'
        +' Успешные попадания: '+state.current+' / '+state.target
        +'. Награда: редкий Настой добытчика в рюкзак, Шаги, опыт профессии и репутация.',
      actions:[{
        id:'special-claim',
        label:state.claimed?'Награда события получена ✓':'Получить приз испытания',
        disabled:!state.ready,
        onSelect:()=>{
          const result=this.activities.claim(spawn,'special',this.getRun?.());
          this.openSpecial(spawn,result.ok?'Испытание пройдено, получен Настой добытчика':result.reason==='inventory-full'?'В рюкзаке нет места, награда сохранена':result.reason);
          return result.ok;
        }
      }],
      meta:info||'Одно событие на Encounter. Если инвентарь полон, награда остаётся ожидающей.'
    });
    return true;
  }

}
