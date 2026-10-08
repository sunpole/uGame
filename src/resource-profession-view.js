const names={stone:'Камень',wood:'Дерево',water:'Вода',clay:'Глина'};
export class ResourceProfessionView {
  constructor({professions,relationships,interactionPanel,buyItem,consumeItem,getItemCount}={}) {
    this.professions=professions;
    this.relationships=relationships;
    this.panel=interactionPanel;
    this.buyItem=buyItem;
    this.consumeItem=consumeItem;
    this.getItemCount=getItemCount;
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
      const remaining=Math.max(0,Math.ceil((progress.buffs[buff.id]||0-Date.now())/1000));
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
}
